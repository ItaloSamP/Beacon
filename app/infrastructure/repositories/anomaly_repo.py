from __future__ import annotations

from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.domain.models import Anomaly, AnomalySeverity, PipelineRun


class AnomalyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, anomaly: Anomaly) -> Anomaly:
        self.db.add(anomaly)
        await self.db.flush()
        await self.db.refresh(anomaly)
        return anomaly

    async def get_by_id(self, anomaly_id: str) -> Anomaly | None:
        result = await self.db.execute(
            select(Anomaly)
            .where(Anomaly.id == anomaly_id)
            .options(joinedload(Anomaly.pipeline_run))
        )
        return result.unique().scalar_one_or_none()

    async def list_all(
        self,
        page: int = 1,
        per_page: int = 50,
        severity: str | None = None,
        type: str | None = None,
        resolved: bool | None = None,
    ) -> dict:
        query = select(Anomaly)
        count_query = select(func.count(Anomaly.id))

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

    async def list_recent(self, limit: int = 10) -> list[Anomaly]:
        result = await self.db.execute(
            select(Anomaly)
            .order_by(Anomaly.detected_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def resolve(self, anomaly_id: str) -> Anomaly | None:
        anomaly = await self.get_by_id(anomaly_id)
        if not anomaly:
            return None
        anomaly.resolved_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(anomaly)
        return anomaly

    async def count_unresolved(self) -> int:
        result = await self.db.execute(
            select(func.count(Anomaly.id)).where(Anomaly.resolved_at.is_(None))
        )
        return result.scalar() or 0
