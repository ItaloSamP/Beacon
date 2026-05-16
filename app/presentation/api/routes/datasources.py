from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.repositories.datasource_repo import DataSourceRepository
from app.application.datasource_service import DataSourceService
from app.presentation.api.middleware.auth import require_auth
from app.domain.schemas import (
    DataSourceCreate,
    DataSourceUpdate,
    ApiResponse,
    PaginatedApiResponse,
)

router = APIRouter(prefix="/datasources", tags=["datasources"])


def _serialize_datasource(ds, mask_config: bool = False) -> dict:
    result = {
        "id": str(ds.id),
        "name": ds.name,
        "type": ds.type.value if hasattr(ds.type, "value") else str(ds.type),
        "agent_id": str(ds.agent_id) if ds.agent_id else None,
        "connection_config": _handle_config(ds.connection_config, mask_config),
        "status": ds.status.value if hasattr(ds.status, "value") else str(ds.status),
        "created_at": ds.created_at.isoformat() if ds.created_at else None,
        "updated_at": ds.updated_at.isoformat() if ds.updated_at else None,
    }

    # Include agent summary if linked
    if ds.agent_id and hasattr(ds, "agent") and ds.agent:
        result["agent"] = {
            "id": str(ds.agent.id),
            "name": ds.agent.name,
            "status": ds.agent.status.value if hasattr(ds.agent.status, "value") else str(ds.agent.status),
        }
    return result


def _handle_config(config, mask: bool) -> dict | str:
    """Handle connection_config based on mask flag."""
    if mask:
        return "****"
    if isinstance(config, dict) and "_encrypted" in config and len(config) == 1:
        # Try to decrypt
        from app.application.datasource_service import DataSourceService
        from app.infrastructure.repositories.datasource_repo import DataSourceRepository
        # We can't instantiate a service here without a db, so just return as-is
        # The service layer handles decryption on get_by_id
        return config
    return config or {}


@router.get("")
async def list_datasources(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    type: str | None = None,
    status: str | None = None,
    agent_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = DataSourceService(DataSourceRepository(db))
    items, total = await service.list(page=page, per_page=per_page, type=type, status=status, agent_id=agent_id)

    data_list = [_serialize_datasource(ds, mask_config=True) for ds in items]

    return PaginatedApiResponse(
        data=data_list,
        meta={"page": page, "per_page": per_page, "total": total},
        error=None,
    )


@router.get("/{id}")
async def get_datasource(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = DataSourceService(DataSourceRepository(db))
    ds = await service.get_by_id(id)

    return ApiResponse(
        data=_serialize_datasource(ds, mask_config=False),
        error=None,
    )


@router.post("", status_code=201)
async def create_datasource(
    req: DataSourceCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = DataSourceService(DataSourceRepository(db))
    ds = await service.create({
        "name": req.name,
        "type": req.type.value,
        "agent_id": req.agent_id,
        "connection_config": req.connection_config,
        "status": req.status.value,
    }, user_id=user_id)

    return ApiResponse(
        data=_serialize_datasource(ds, mask_config=True),
        error=None,
    )


@router.put("/{id}")
async def update_datasource(
    id: UUID,
    req: DataSourceUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    user_id = UUID(_user["user_id"])
    service = DataSourceService(DataSourceRepository(db))
    update_data = {}
    if req.name is not None:
        update_data["name"] = req.name
    if req.type is not None:
        update_data["type"] = req.type.value
    if req.connection_config is not None:
        update_data["connection_config"] = req.connection_config
    if req.status is not None:
        update_data["status"] = req.status.value
    if req.agent_id is not None or "agent_id" in req.model_dump(exclude_unset=True):
        update_data["agent_id"] = req.agent_id

    ds = await service.update(id, update_data, user_id=user_id)

    return ApiResponse(
        data=_serialize_datasource(ds, mask_config=True),
        error=None,
    )


@router.delete("/{id}", status_code=204)
async def delete_datasource(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = DataSourceService(DataSourceRepository(db))
    await service.delete(id)
    return None
