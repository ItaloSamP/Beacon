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


@router.get("")
async def list_datasources(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    type: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = DataSourceService(DataSourceRepository(db))
    items, total = await service.list(page=page, per_page=per_page, type=type, status=status)

    data_list = []
    for ds in items:
        data_list.append({
            "id": str(ds.id),
            "name": ds.name,
            "type": ds.type.value if hasattr(ds.type, "value") else str(ds.type),
            "connection_config": ds.connection_config or {},
            "status": ds.status.value if hasattr(ds.status, "value") else str(ds.status),
            "created_at": ds.created_at.isoformat() if ds.created_at else None,
            "updated_at": ds.updated_at.isoformat() if ds.updated_at else None,
        })

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
        data={
            "id": str(ds.id),
            "name": ds.name,
            "type": ds.type.value if hasattr(ds.type, "value") else str(ds.type),
            "connection_config": ds.connection_config or {},
            "status": ds.status.value if hasattr(ds.status, "value") else str(ds.status),
            "created_at": ds.created_at.isoformat() if ds.created_at else None,
            "updated_at": ds.updated_at.isoformat() if ds.updated_at else None,
        },
        error=None,
    )


@router.post("", status_code=201)
async def create_datasource(
    req: DataSourceCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = DataSourceService(DataSourceRepository(db))
    ds = await service.create({
        "name": req.name,
        "type": req.type.value,
        "connection_config": req.connection_config,
        "status": req.status.value,
    })

    return ApiResponse(
        data={
            "id": str(ds.id),
            "name": ds.name,
            "type": ds.type.value if hasattr(ds.type, "value") else str(ds.type),
            "connection_config": ds.connection_config or {},
            "status": ds.status.value if hasattr(ds.status, "value") else str(ds.status),
            "created_at": ds.created_at.isoformat() if ds.created_at else None,
            "updated_at": ds.updated_at.isoformat() if ds.updated_at else None,
        },
        error=None,
    )


@router.put("/{id}")
async def update_datasource(
    id: UUID,
    req: DataSourceUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
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

    ds = await service.update(id, update_data)

    return ApiResponse(
        data={
            "id": str(ds.id),
            "name": ds.name,
            "type": ds.type.value if hasattr(ds.type, "value") else str(ds.type),
            "connection_config": ds.connection_config or {},
            "status": ds.status.value if hasattr(ds.status, "value") else str(ds.status),
            "created_at": ds.created_at.isoformat() if ds.created_at else None,
            "updated_at": ds.updated_at.isoformat() if ds.updated_at else None,
        },
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
