from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.repositories.alert_repo import AlertRepository
from app.presentation.api.middleware.auth import require_auth
from app.domain.schemas import ApiResponse

router = APIRouter(prefix="/alerts", tags=["alerts"])


def _serialize_alert(alert) -> dict:
    anomaly_description = ""
    anomaly_id = ""
    if alert.anomaly:
        anomaly_id = str(alert.anomaly.id)
        anomaly_description = alert.anomaly.description or ""

    return {
        "id": str(alert.id),
        "anomaly": {
            "id": anomaly_id,
            "description": anomaly_description,
        },
        "channel": alert.channel.value if hasattr(alert.channel, "value") else str(alert.channel),
        "status": alert.status.value if hasattr(alert.status, "value") else str(alert.status),
        "sent_at": alert.sent_at.isoformat() if alert.sent_at else None,
        "recipient": alert.recipient if hasattr(alert, "recipient") and alert.recipient else "",
    }


@router.get("")
async def list_alerts(
    channel: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_auth),
):
    repo = AlertRepository(db)
    alerts = await repo.list_all(channel=channel, status=status)
    data_list = [_serialize_alert(a) for a in alerts]

    return {"data": data_list, "meta": {"total": len(data_list)}, "error": None}
