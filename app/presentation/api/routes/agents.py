from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.repositories.agent_repo import AgentRepository
from app.application.agent_service import AgentService
from app.presentation.api.middleware.auth import require_auth
from app.domain.schemas import (
    AgentCreate,
    AgentUpdate,
    ApiResponse,
    PaginatedApiResponse,
)

router = APIRouter(prefix="/agents", tags=["agents"])


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


@router.get("")
async def list_agents(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = AgentService(AgentRepository(db))
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
    service = AgentService(AgentRepository(db))
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
    service = AgentService(AgentRepository(db))
    agent = await service.create(
        user_id=user_id,
        data={
            "name": req.name,
            "status": req.status.value,
            "version": req.version,
        },
    )

    return ApiResponse(
        data=_serialize_agent(agent),
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
    service = AgentService(AgentRepository(db))

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
    service = AgentService(AgentRepository(db))
    await service.delete(id, user_id)
    return None
