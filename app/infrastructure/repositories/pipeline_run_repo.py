from __future__ import annotations

from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.domain.models import Agent, DataSource, Pipeline, PipelineRun, PipelineRunStatus


class PipelineRunRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, pipeline_run: PipelineRun) -> PipelineRun:
        self.session.add(pipeline_run)
        await self.session.flush()
        await self.session.refresh(pipeline_run)
        return pipeline_run

    async def get_by_id(self, run_id: str, user_id: UUID | None = None) -> PipelineRun | None:
        query = (
            select(PipelineRun)
            .where(PipelineRun.id == run_id)
            .options(selectinload(PipelineRun.pipeline))
        )
        if user_id is not None:
            query = (
                query
                .join(PipelineRun.pipeline)
                .join(Pipeline.data_source)
                .join(DataSource.agent)
                .where(Agent.user_id == user_id)
            )
        result = await self.session.execute(query)
        return result.unique().scalar_one_or_none()

    async def list_by_pipeline(
        self, pipeline_id: str, page: int = 1, per_page: int = 50, user_id: UUID | None = None
    ) -> dict:
        base_query = select(PipelineRun).where(PipelineRun.pipeline_id == pipeline_id)
        count_query = select(func.count(PipelineRun.id)).where(
            PipelineRun.pipeline_id == pipeline_id
        )
        if user_id is not None:
            base_query = (
                base_query
                .join(PipelineRun.pipeline)
                .join(Pipeline.data_source)
                .join(DataSource.agent)
                .where(Agent.user_id == user_id)
            )
            count_query = (
                count_query
                .join(PipelineRun.pipeline)
                .join(Pipeline.data_source)
                .join(DataSource.agent)
                .where(Agent.user_id == user_id)
            )

        total_result = await self.session.execute(count_query)
        total = total_result.scalar() or 0

        query = (
            base_query.options(selectinload(PipelineRun.pipeline))
            .offset((page - 1) * per_page)
            .limit(per_page)
            .order_by(PipelineRun.started_at.desc())
        )
        result = await self.session.execute(query)
        items = list(result.unique().scalars().all())

        return {"data": items, "total": total}

    async def list_recent(self, limit: int = 10, user_id: UUID | None = None) -> list[PipelineRun]:
        query = (
            select(PipelineRun)
            .options(selectinload(PipelineRun.pipeline))
            .order_by(PipelineRun.started_at.desc())
            .limit(limit)
        )
        if user_id is not None:
            query = (
                query
                .join(PipelineRun.pipeline)
                .join(Pipeline.data_source)
                .join(DataSource.agent)
                .where(Agent.user_id == user_id)
            )
        result = await self.session.execute(query)
        return list(result.unique().scalars().all())

    async def update_status(
        self,
        run_id: str,
        status: PipelineRunStatus,
        metrics_json: dict | None = None,
        finished_at: datetime | None = None,
    ) -> PipelineRun | None:
        result = await self.session.execute(
            select(PipelineRun).where(PipelineRun.id == run_id)
        )
        pipeline_run = result.scalar_one_or_none()
        if pipeline_run is None:
            return None

        pipeline_run.status = status
        if metrics_json is not None:
            pipeline_run.metrics_json = metrics_json
        if finished_at is not None:
            pipeline_run.finished_at = finished_at

        await self.session.flush()
        await self.session.refresh(pipeline_run)
        return pipeline_run
