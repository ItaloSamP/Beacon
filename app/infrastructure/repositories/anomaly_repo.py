from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.domain.models import Agent, Anomaly, DataSource, Pipeline, PipelineRun


class AnomalyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, anomaly: Anomaly) -> Anomaly:
        self.db.add(anomaly)
        await self.db.flush()
        await self.db.refresh(anomaly)
        return anomaly

    async def get_by_id(self, anomaly_id: str, user_id: UUID | None = None) -> Anomaly | None:
        query = select(Anomaly).where(Anomaly.id == anomaly_id)
        if user_id is not None:
            query = query.join(PipelineRun).join(Pipeline).join(DataSource).join(Agent).where(Agent.user_id == user_id)
        query = query.options(joinedload(Anomaly.pipeline_run))
        result = await self.db.execute(query)
        return result.unique().scalar_one_or_none()

    async def list_all(
        self,
        page: int = 1,
        per_page: int = 50,
        severity: str | None = None,
        type: str | None = None,
        resolved: bool | None = None,
        user_id: UUID | None = None,
    ) -> dict:
        query = select(Anomaly)
        count_query = select(func.count(Anomaly.id))

        if user_id is not None:
            query = query.join(PipelineRun).join(Pipeline).join(DataSource).join(Agent).where(Agent.user_id == user_id)
            count_query = count_query.join(PipelineRun).join(Pipeline).join(DataSource).join(Agent).where(Agent.user_id == user_id)

        if severity:
            query = query.where(Anomaly.severity == severity)
            count_query = count_query.where(Anomaly.severity == severity)
        if type:
            query = query.where(Anomaly.type == type)
            count_query = count_query.where(Anomaly.type == type)
        if resolved is True:
            query = query.where(Anomaly.resolved_at.isnot(None))
            count_query = count_query.where(Anomaly.resolved_at.isnot(None))
        elif resolved is False:
            query = query.where(Anomaly.resolved_at.is_(None))
            count_query = count_query.where(Anomaly.resolved_at.is_(None))

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .order_by(Anomaly.detected_at.desc())
        )
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return {"data": items, "total": total}

    async def list_recent(self, limit: int = 10, user_id: UUID | None = None) -> list[Anomaly]:
        query = select(Anomaly)
        if user_id is not None:
            query = query.join(PipelineRun).join(Pipeline).join(DataSource).join(Agent).where(Agent.user_id == user_id)
        result = await self.db.execute(
            query.order_by(Anomaly.detected_at.desc()).limit(limit)
        )
        return list(result.scalars().all())

    async def resolve(self, anomaly_id: str, user_id: UUID | None = None) -> Anomaly | None:
        anomaly = await self.get_by_id(anomaly_id, user_id=user_id)
        if not anomaly:
            return None
        anomaly.resolved_at = datetime.now(UTC)
        await self.db.flush()
        await self.db.refresh(anomaly)
        return anomaly

    async def count_unresolved(self, user_id: UUID | None = None) -> int:
        query = select(func.count(Anomaly.id)).where(Anomaly.resolved_at.is_(None))
        if user_id is not None:
            query = query.join(PipelineRun).join(Pipeline).join(DataSource).join(Agent).where(Agent.user_id == user_id)
        result = await self.db.execute(query)
        return result.scalar() or 0
