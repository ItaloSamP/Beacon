from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import AlertRule


class AlertRuleRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, rule: AlertRule) -> AlertRule:
        self.db.add(rule)
        await self.db.flush()
        await self.db.refresh(rule)
        return rule

    async def get_by_id(self, rule_id: UUID) -> AlertRule | None:
        result = await self.db.execute(
            select(AlertRule).where(AlertRule.id == rule_id)
        )
        return result.scalar_one_or_none()

    async def list_by_pipeline(self, pipeline_id: UUID) -> list[AlertRule]:
        result = await self.db.execute(
            select(AlertRule)
            .where(AlertRule.pipeline_id == pipeline_id)
            .order_by(AlertRule.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_active_by_pipeline(self, pipeline_id: UUID) -> list[AlertRule]:
        result = await self.db.execute(
            select(AlertRule)
            .where(AlertRule.pipeline_id == pipeline_id, AlertRule.enabled.is_(True))
        )
        return list(result.scalars().all())

    async def update(self, rule: AlertRule) -> AlertRule:
        await self.db.flush()
        await self.db.refresh(rule)
        return rule

    async def delete(self, rule: AlertRule) -> None:
        await self.db.delete(rule)
        await self.db.flush()
