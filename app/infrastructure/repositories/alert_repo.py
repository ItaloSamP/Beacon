from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from uuid import UUID

from app.domain.models import Agent, Alert, AlertStatus, Anomaly, DataSource, Pipeline, PipelineRun


class AlertRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, alert: Alert) -> Alert:
        self.db.add(alert)
        await self.db.flush()
        await self.db.refresh(alert)
        return alert

    async def get_by_id(self, alert_id: str, *, user_id: UUID | None = None) -> Alert | None:
        query = select(Alert).where(Alert.id == alert_id)
        if user_id is not None:
            query = query.join(Alert.anomaly).join(Anomaly.pipeline_run).join(PipelineRun.pipeline).join(Pipeline.data_source).join(DataSource.agent).where(Agent.user_id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_all(self, channel: str | None = None, status: str | None = None, *, user_id: UUID | None = None) -> list[Alert]:
        query = select(Alert).options(joinedload(Alert.anomaly))
        if channel:
            query = query.where(Alert.channel == channel)
        if status:
            query = query.where(Alert.status == status)
        if user_id is not None:
            query = query.join(Alert.anomaly).join(Anomaly.pipeline_run).join(PipelineRun.pipeline).join(Pipeline.data_source).join(DataSource.agent).where(Agent.user_id == user_id)
        query = query.order_by(Alert.sent_at.desc().nulls_last())
        result = await self.db.execute(query)
        return list(result.unique().scalars().all())

    async def list_by_anomaly(self, anomaly_id: str, *, user_id: UUID | None = None) -> list[Alert]:
        query = (
            select(Alert)
            .where(Alert.anomaly_id == anomaly_id)
        )
        if user_id is not None:
            query = query.join(Alert.anomaly).join(Anomaly.pipeline_run).join(PipelineRun.pipeline).join(Pipeline.data_source).join(DataSource.agent).where(Agent.user_id == user_id)
        query = query.order_by(Alert.sent_at.desc())
        result = await self.db.execute(query)
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
