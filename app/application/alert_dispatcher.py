from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import Alert, AlertStatus
from app.infrastructure.repositories.alert_repo import AlertRepository
from app.infrastructure.notifiers.email import EmailNotifier


class AlertDispatcher:
    def __init__(self, db: AsyncSession, alert_repo=None, notifier=None):
        self.db = db
        self.alert_repo = alert_repo
        self.notifier = notifier or EmailNotifier()

    async def dispatch(self, anomaly, alert_rules=None) -> list:
        alerts = []
        if self.alert_repo:
            alert = Alert(
                anomaly_id=anomaly.id,
                channel="email",
                status=AlertStatus.sent,
                sent_at=datetime.now(timezone.utc),
            )
            alert = await self.alert_repo.create(alert)
            alerts.append(alert)
        return alerts
