from __future__ import annotations

from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.domain.models import PipelineRun, PipelineRunStatus


class PipelineRunRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, pipeline_run: PipelineRun) -> PipelineRun:
        self.session.add(pipeline_run)
        await self.session.flush()
        await self.session.refresh(pipeline_run)
        return pipeline_run

    async def get_by_id(self, run_id: str) -> PipelineRun | None:
        result = await self.session.execute(
            select(PipelineRun)
            .where(PipelineRun.id == run_id)
            .options(selectinload(PipelineRun.pipeline))
        )
        return result.unique().scalar_one_or_none()

    async def list_by_pipeline(
        self, pipeline_id: str, page: int = 1, per_page: int = 50
    ) -> dict:
        base_query = select(PipelineRun).where(PipelineRun.pipeline_id == pipeline_id)
        count_query = select(func.count(PipelineRun.id)).where(
            PipelineRun.pipeline_id == pipeline_id
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

    async def list_recent(self, limit: int = 10) -> list[PipelineRun]:
        result = await self.session.execute(
            select(PipelineRun)
            .options(selectinload(PipelineRun.pipeline))
            .order_by(PipelineRun.started_at.desc())
            .limit(limit)
        )
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
