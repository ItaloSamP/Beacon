from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import Anomaly, AnomalySeverity
from app.infrastructure.repositories.anomaly_repo import AnomalyRepository


class AnomalyService:
    def __init__(self, db: AsyncSession, anomaly_repo=None, alert_dispatcher=None):
        self.db = db
        self.anomaly_repo = anomaly_repo or AnomalyRepository(db)
        self.alert_dispatcher = alert_dispatcher

    async def process_anomaly(self, anomaly_data: dict) -> Anomaly:
        anomaly = Anomaly(
            pipeline_run_id=anomaly_data["pipeline_run_id"],
            severity=anomaly_data["severity"],
            type=anomaly_data["type"],
            description=anomaly_data.get("description", ""),
            deviation_details=anomaly_data.get("deviation_details", {}),
            detected_at=datetime.now(timezone.utc),
        )
        anomaly = await self.anomaly_repo.create(anomaly)
        return anomaly

    async def list_anomalies(
        self,
        page: int = 1,
        per_page: int = 50,
        severity: str | None = None,
        type: str | None = None,
        resolved: bool | None = None,
    ):
        return await self.anomaly_repo.list_all(
            page, per_page, severity, type, resolved
        )

    async def get_anomaly(self, anomaly_id: str) -> Anomaly | None:
        return await self.anomaly_repo.get_by_id(anomaly_id)

    async def resolve_anomaly(self, anomaly_id: str) -> Anomaly | None:
        return await self.anomaly_repo.resolve(anomaly_id)
