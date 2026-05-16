from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.repositories.pipeline_run_repo import PipelineRunRepository
from app.application.pipeline_runner import PipelineRunService
from app.presentation.api.middleware.auth import require_auth
from app.shared.exceptions import NotFoundException
from app.domain.schemas import (
    ApiResponse,
    PaginatedApiResponse,
    PipelineRunResponse,
    PipelineRunTriggerResponse,
    PipelineRunListResponse,
)

router = APIRouter(tags=["pipeline-runs"])


def _serialize_pipeline_run(run) -> dict:
    data = {
        "id": str(run.id),
        "pipeline_id": str(run.pipeline_id),
        "status": run.status.value if hasattr(run.status, "value") else str(run.status),
        "metrics_json": run.metrics_json or {},
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
    }
    if run.pipeline:
        data["pipeline"] = {
            "id": str(run.pipeline.id),
            "name": run.pipeline.name,
            "type": run.pipeline.type.value if hasattr(run.pipeline.type, "value") else str(run.pipeline.type),
            "data_source_id": str(run.pipeline.data_source_id),
            "schedule": run.pipeline.schedule,
            "config": run.pipeline.config or {},
            "enabled": run.pipeline.enabled,
            "created_at": run.pipeline.created_at.isoformat() if run.pipeline.created_at else None,
            "updated_at": run.pipeline.updated_at.isoformat() if run.pipeline.updated_at else None,
        }
    return data


@router.post("/pipelines/{pipeline_id}/run", status_code=202)
async def trigger_pipeline_run(
    pipeline_id: UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = PipelineRunService(db)
    background_tasks.add_task(service.run_pipeline, str(pipeline_id))
    return ApiResponse(
        data=PipelineRunTriggerResponse(
            run_id="pending",
            pipeline_id=str(pipeline_id),
            status="started",
        )
    )


@router.get("/pipelines/{pipeline_id}/runs")
async def list_pipeline_runs(
    pipeline_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    repo = PipelineRunRepository(db)
    result = await repo.list_by_pipeline(str(pipeline_id), page=page, per_page=per_page)
    data_list = [_serialize_pipeline_run(r) for r in result["data"]]
    return PaginatedApiResponse(
        data=data_list,
        meta={"page": page, "per_page": per_page, "total": result["total"]},
        error=None,
    )


@router.get("/pipeline-runs/{run_id}")
async def get_pipeline_run(
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    repo = PipelineRunRepository(db)
    run = await repo.get_by_id(str(run_id))
    if not run:
        raise NotFoundException("Pipeline run not found")
    return ApiResponse(data=_serialize_pipeline_run(run), error=None)


@router.get("/pipeline-runs/recent")
async def list_recent_runs(
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    repo = PipelineRunRepository(db)
    runs = await repo.list_recent(limit=limit)
    data_list = [_serialize_pipeline_run(r) for r in runs]
    return ApiResponse(data=data_list, error=None)
