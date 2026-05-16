from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.repositories.anomaly_repo import AnomalyRepository
from app.infrastructure.repositories.alert_repo import AlertRepository
from app.application.anomaly_service import AnomalyService
from app.application.alert_dispatcher import AlertDispatcher
from app.presentation.api.middleware.auth import require_auth
from app.shared.exceptions import NotFoundException
from app.domain.schemas import (
    AnomalyCreate,
    ApiResponse,
    PaginatedApiResponse,
)

router = APIRouter(prefix="/anomalies", tags=["anomalies"])


def _serialize_anomaly(anomaly) -> dict:
    data = {
        "id": str(anomaly.id),
        "pipeline_run_id": str(anomaly.pipeline_run_id),
        "severity": anomaly.severity.value if hasattr(anomaly.severity, "value") else str(anomaly.severity),
        "type": anomaly.type,
        "description": anomaly.description,
        "deviation_details": anomaly.deviation_details or {},
        "detected_at": anomaly.detected_at.isoformat() if anomaly.detected_at else None,
        "resolved_at": anomaly.resolved_at.isoformat() if anomaly.resolved_at else None,
    }
    return data


@router.get("/recent")
async def list_recent_anomalies(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = AnomalyService(db)
    items = await service.anomaly_repo.list_recent(limit=limit)
    data_list = [_serialize_anomaly(a) for a in items]
    return ApiResponse(data=data_list, error=None)


@router.get("")
async def list_anomalies(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    severity: str | None = None,
    type: str | None = None,
    resolved: bool | None = None,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = AnomalyService(db)
    result = await service.list_anomalies(
        page=page,
        per_page=per_page,
        severity=severity,
        type=type,
        resolved=resolved,
    )
    data_list = [_serialize_anomaly(a) for a in result["data"]]

    return PaginatedApiResponse(
        data=data_list,
        meta={"page": page, "per_page": per_page, "total": result["total"]},
        error=None,
    )


@router.get("/{id}")
async def get_anomaly(
    id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = AnomalyService(db)
    anomaly = await service.get_anomaly(id)
    if not anomaly:
        raise NotFoundException("Anomaly not found")

    return ApiResponse(data=_serialize_anomaly(anomaly), error=None)


@router.post("", status_code=201)
async def create_anomaly(
    req: AnomalyCreate,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = AnomalyService(db)
    anomaly = await service.process_anomaly({
        "pipeline_run_id": req.pipeline_run_id,
        "severity": req.severity,
        "type": req.type,
        "description": req.description,
        "deviation_details": req.deviation_details,
    })

    return ApiResponse(data=_serialize_anomaly(anomaly), error=None)


@router.post("/{id}/resolve")
async def resolve_anomaly(
    id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    service = AnomalyService(db)
    anomaly = await service.resolve_anomaly(id)
    if not anomaly:
        raise NotFoundException("Anomaly not found")

    return ApiResponse(data=_serialize_anomaly(anomaly), error=None)
