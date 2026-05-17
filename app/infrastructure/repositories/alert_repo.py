from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.domain.models import Alert, AlertStatus


class AlertRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, alert: Alert) -> Alert:
        self.db.add(alert)
        await self.db.flush()
        await self.db.refresh(alert)
        return alert

    async def get_by_id(self, alert_id: str) -> Alert | None:
        result = await self.db.execute(select(Alert).where(Alert.id == alert_id))
        return result.scalar_one_or_none()

    async def list_by_anomaly(self, anomaly_id: str) -> list[Alert]:
        result = await self.db.execute(
            select(Alert)
            .where(Alert.anomaly_id == anomaly_id)
            .order_by(Alert.sent_at.desc())
        )
        return list(result.scalars().all())

    async def update_status(
        self, alert_id: str, status: AlertStatus, error_message: str | None = None
    ) -> Alert | None:
        alert = await self.get_by_id(alert_id)
        if not alert:
            return None
        alert.status = status
        if error_message is not None:
            alert.error_message = error_message
        await self.db.flush()
        await self.db.refresh(alert)
        return alert
