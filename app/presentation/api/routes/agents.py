from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.repositories.agent_repo import AgentRepository
from app.infrastructure.repositories.agent_token_repo import AgentTokenRepository
from app.application.agent_service import AgentService
from app.presentation.api.middleware.auth import require_auth
from app.domain.schemas import (
    AgentCreate,
    AgentUpdate,
    ApiResponse,
    PaginatedApiResponse,
)

router = APIRouter(prefix="/agents", tags=["agents"])

# Special router for agent-specific endpoints that don't nest under /agents/{id}/...
agent_self_router = APIRouter(prefix="/agent", tags=["agent-self"])


def _serialize_agent(agent) -> dict:
    return {
        "id": str(agent.id),
        "name": agent.name,
        "status": agent.status.value if hasattr(agent.status, "value") else str(agent.status),
        "user_id": str(agent.user_id),
        "last_heartbeat_at": agent.last_heartbeat_at.isoformat() if agent.last_heartbeat_at else None,
        "version": agent.version,
        "created_at": agent.created_at.isoformat() if agent.created_at else None,
    }


def _make_service(db: AsyncSession) -> AgentService:
    return AgentService(AgentRepository(db), AgentTokenRepository(db))


@router.get("")
async def list_agents(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = _make_service(db)
    items, total = await service.list_by_user(
        user_id=user_id, page=page, per_page=per_page, status=status
    )

    data_list = [_serialize_agent(a) for a in items]

    return PaginatedApiResponse(
        data=data_list,
        meta={"page": page, "per_page": per_page, "total": total},
        error=None,
    )


@router.get("/{id}")
async def get_agent(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = _make_service(db)
    agent = await service.get_by_id(id, user_id)

    return ApiResponse(
        data=_serialize_agent(agent),
        error=None,
    )


@router.post("", status_code=201)
async def create_agent(
    req: AgentCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = _make_service(db)
    agent = await service.create(
        user_id=user_id,
        data={
            "name": req.name,
            "status": req.status.value,
            "version": req.version,
        },
    )

    # Generate agent token on creation
    full_token, token_obj = await service.create_agent_token(agent.id)

    result = _serialize_agent(agent)
    result["agent_token"] = full_token

    return ApiResponse(
        data=result,
        error=None,
    )


@router.put("/{id}")
async def update_agent(
    id: UUID,
    req: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = _make_service(db)

    update_data = {}
    if req.name is not None:
        update_data["name"] = req.name
    if req.status is not None:
        update_data["status"] = req.status.value
    if req.version is not None:
        update_data["version"] = req.version

    agent = await service.update(id, user_id, update_data)

    return ApiResponse(
        data=_serialize_agent(agent),
        error=None,
    )


@router.delete("/{id}", status_code=204)
async def delete_agent(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = _make_service(db)
    await service.delete(id, user_id)
    return None


# ---------------------------------------------------------------
# Agent Token CRUD
# ---------------------------------------------------------------

@router.get("/{id}/tokens")
async def list_agent_tokens(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = _make_service(db)
    tokens = await service.list_tokens(id, user_id)

    data_list = [
        {
            "id": str(t.id),
            "token_prefix": t.token_prefix,
            "name": t.name,
            "last_used_at": t.last_used_at.isoformat() if t.last_used_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tokens
    ]

    return ApiResponse(data=data_list, error=None)


@router.delete("/{id}/tokens/{token_id}", status_code=204)
async def revoke_agent_token(
    id: UUID,
    token_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = _make_service(db)
    await service.revoke_token(token_id, id, user_id)
    return None


# ---------------------------------------------------------------
# Agent Heartbeat
# ---------------------------------------------------------------

@router.post("/{id}/heartbeat")
async def agent_heartbeat(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    # Verify agent token auth
    if _user.get("auth_method") != "agent_token":
        from app.shared.exceptions import UnauthorizedException
        raise UnauthorizedException("Agent token required")

    if str(_user.get("agent_id")) != str(id):
        from app.shared.exceptions import UnauthorizedException
        raise UnauthorizedException("Agent token mismatch")

    service = _make_service(db)
    agent = await service.heartbeat(id)

    return ApiResponse(
        data=_serialize_agent(agent),
        error=None,
    )


# ---------------------------------------------------------------
# Agent Self Config (standalone router, NOT under /agents)
# ---------------------------------------------------------------

@agent_self_router.get("/self/config")
async def agent_self_config(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    """Return full config for the authenticated agent."""
    if _user.get("auth_method") != "agent_token":
        from app.shared.exceptions import UnauthorizedException
        raise UnauthorizedException("Agent token required")

    agent_id = UUID(_user["agent_id"])
    service = _make_service(db)
    agent = await service.get_config_for_agent(agent_id)

    # Get data sources linked to this agent with decrypted config
    from app.infrastructure.repositories.datasource_repo import DataSourceRepository
    from app.application.datasource_service import DataSourceService

    ds_service = DataSourceService(DataSourceRepository(db))
    ds_configs = await ds_service.get_config_for_agent(agent_id)

    # Get pipelines linked to any data source of this agent
    from sqlalchemy import select
    from app.domain.models import Pipeline, DataSource

    result = await db.execute(
        select(Pipeline).join(DataSource).where(DataSource.agent_id == agent_id)
    )
    pipelines = list(result.scalars().all())

    pipelines_data = [
        {
            "id": str(p.id),
            "name": p.name,
            "type": p.type.value if hasattr(p.type, "value") else str(p.type),
            "config": p.config or {},
            "enabled": p.enabled,
            "data_source_id": str(p.data_source_id),
        }
        for p in pipelines
    ]

    settings_data = {
        "heartbeat_interval": 30,
        "profile_interval": 300,
        "zscore_threshold": 3.0,
        "baseline_window": 30,
    }

    return ApiResponse(
        data={
            "agent": _serialize_agent(agent),
            "data_sources": ds_configs,
            "pipelines": pipelines_data,
            "settings": settings_data,
        },
        error=None,
    )
