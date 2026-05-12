from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.repositories.pipeline_repo import PipelineRepository
from app.infrastructure.repositories.datasource_repo import DataSourceRepository
from app.application.pipeline_service import PipelineService
from app.presentation.api.middleware.auth import require_auth
from app.shared.exceptions import BadRequestException
from app.domain.schemas import (
    PipelineCreate,
    PipelineUpdate,
    ApiResponse,
    PaginatedApiResponse,
)

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


def _serialize_pipeline(pipeline, include_data_source: bool = False):
    data = {
        "id": str(pipeline.id),
        "name": pipeline.name,
        "type": pipeline.type.value if hasattr(pipeline.type, "value") else str(pipeline.type),
        "data_source_id": str(pipeline.data_source_id),
        "schedule": pipeline.schedule,
        "config": pipeline.config or {},
        "enabled": pipeline.enabled,
        "created_at": pipeline.created_at.isoformat() if pipeline.created_at else None,
        "updated_at": pipeline.updated_at.isoformat() if pipeline.updated_at else None,
    }
    if include_data_source and pipeline.data_source:
        data["data_source"] = {
            "id": str(pipeline.data_source.id),
            "name": pipeline.data_source.name,
        }
    return data


@router.get("")
async def list_pipelines(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    type: str | None = None,
    data_source_id: UUID | None = None,
    enabled: bool | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = PipelineService(PipelineRepository(db))
    items, total = await service.list(
        page=page,
        per_page=per_page,
        type=type,
        data_source_id=data_source_id,
        enabled=enabled,
    )

    data_list = [_serialize_pipeline(p) for p in items]

    return PaginatedApiResponse(
        data=data_list,
        meta={"page": page, "per_page": per_page, "total": total},
        error=None,
    )


@router.get("/{id}")
async def get_pipeline(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = PipelineService(PipelineRepository(db))
    pipeline = await service.get_by_id(id)

    return ApiResponse(
        data=_serialize_pipeline(pipeline, include_data_source=True),
        error=None,
    )


@router.post("", status_code=201)
async def create_pipeline(
    req: PipelineCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    ds_repo = DataSourceRepository(db)
    ds = await ds_repo.get_by_id(req.data_source_id)
    if not ds:
        raise BadRequestException("Data source not found")

    service = PipelineService(PipelineRepository(db))
    pipeline = await service.create({
        "name": req.name,
        "type": req.type.value,
        "data_source_id": req.data_source_id,
        "schedule": req.schedule,
        "config": req.config,
        "enabled": req.enabled,
    })

    return ApiResponse(
        data=_serialize_pipeline(pipeline),
        error=None,
    )


@router.put("/{id}")
async def update_pipeline(
    id: UUID,
    req: PipelineUpdate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = PipelineService(PipelineRepository(db))
    update_data = {}
    if req.name is not None:
        update_data["name"] = req.name
    if req.type is not None:
        update_data["type"] = req.type.value
    if req.schedule is not None:
        update_data["schedule"] = req.schedule
    if req.config is not None:
        update_data["config"] = req.config
    if req.enabled is not None:
        update_data["enabled"] = req.enabled

    pipeline = await service.update(id, update_data)

    return ApiResponse(
        data=_serialize_pipeline(pipeline),
        error=None,
    )


@router.delete("/{id}", status_code=204)
async def delete_pipeline(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = PipelineService(PipelineRepository(db))
    await service.delete(id)
    return None
