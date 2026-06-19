from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import AlertRule
from app.domain.schemas import AlertRuleCreate, AlertRuleUpdate
from app.infrastructure.repositories.alert_rule_repo import AlertRuleRepository
from app.infrastructure.repositories.pipeline_repo import PipelineRepository
from app.shared.exceptions import NotFoundException


class AlertRuleService:
    def __init__(self, db: AsyncSession, rule_repo: AlertRuleRepository | None = None):
        self.db = db
        self.rule_repo = rule_repo or AlertRuleRepository(db)

    async def _verify_pipeline_ownership(
        self, pipeline_id: UUID, user_id: UUID
    ) -> None:
        """Verify pipeline exists and belongs to the given user."""
        pipeline_repo = PipelineRepository(self.db)
        pipeline = await pipeline_repo.get_by_id(pipeline_id)
        if not pipeline:
            raise NotFoundException("Pipeline not found")

        # Walk the ownership chain: pipeline -> data_source -> agent -> user
        if pipeline.data_source and pipeline.data_source.agent:
            owner_id = pipeline.data_source.agent.user_id
            if owner_id != user_id:
                raise NotFoundException("Pipeline not found")

    async def create(
        self, pipeline_id: UUID, user_id: UUID, data: AlertRuleCreate
    ) -> AlertRule:
        await self._verify_pipeline_ownership(pipeline_id, user_id)

        rule = AlertRule(
            pipeline_id=pipeline_id,
            metric=data.metric,
            operator=data.operator,
            threshold=data.threshold,
            channels=data.channels or [],
            enabled=data.enabled,
        )
        return await self.rule_repo.create(rule)

    async def get_by_id(
        self, pipeline_id: UUID, rule_id: UUID, user_id: UUID
    ) -> AlertRule:
        await self._verify_pipeline_ownership(pipeline_id, user_id)

        rule = await self.rule_repo.get_by_id(rule_id)
        if not rule or rule.pipeline_id != pipeline_id:
            raise NotFoundException("Alert rule not found")
        return rule

    async def list_by_pipeline(
        self, pipeline_id: UUID, user_id: UUID
    ) -> list[AlertRule]:
        await self._verify_pipeline_ownership(pipeline_id, user_id)
        return await self.rule_repo.list_by_pipeline(pipeline_id)

    async def update(
        self,
        pipeline_id: UUID,
        rule_id: UUID,
        user_id: UUID,
        data: AlertRuleUpdate,
    ) -> AlertRule:
        await self._verify_pipeline_ownership(pipeline_id, user_id)

        rule = await self.rule_repo.get_by_id(rule_id)
        if not rule or rule.pipeline_id != pipeline_id:
            raise NotFoundException("Alert rule not found")

        if data.metric is not None:
            rule.metric = data.metric
        if data.operator is not None:
            rule.operator = data.operator
        if data.threshold is not None:
            rule.threshold = data.threshold
        if data.channels is not None:
            rule.channels = data.channels
        if data.enabled is not None:
            rule.enabled = data.enabled

        return await self.rule_repo.update(rule)

    async def delete(
        self, pipeline_id: UUID, rule_id: UUID, user_id: UUID
    ) -> None:
        await self._verify_pipeline_ownership(pipeline_id, user_id)

        rule = await self.rule_repo.get_by_id(rule_id)
        if not rule or rule.pipeline_id != pipeline_id:
            raise NotFoundException("Alert rule not found")

        await self.rule_repo.delete(rule)
