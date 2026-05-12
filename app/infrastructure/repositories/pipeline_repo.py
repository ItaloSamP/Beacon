from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.domain.models import Pipeline


class PipelineRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: UUID) -> Pipeline | None:
        result = await self.db.execute(
            select(Pipeline).where(Pipeline.id == id).options(joinedload(Pipeline.data_source))
        )
        return result.unique().scalar_one_or_none()

    async def list(
        self,
        page: int = 1,
        per_page: int = 50,
        type: str | None = None,
        data_source_id: UUID | None = None,
        enabled: bool | None = None,
    ) -> tuple[list[Pipeline], int]:
        query = select(Pipeline)
        count_query = select(func.count(Pipeline.id))

        if type:
            query = query.where(Pipeline.type == type)
            count_query = count_query.where(Pipeline.type == type)
        if data_source_id is not None:
            query = query.where(Pipeline.data_source_id == data_source_id)
            count_query = count_query.where(Pipeline.data_source_id == data_source_id)
        if enabled is not None:
            query = query.where(Pipeline.enabled == enabled)
            count_query = count_query.where(Pipeline.enabled == enabled)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .order_by(Pipeline.created_at.desc())
        )
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def create(self, pipeline: Pipeline) -> Pipeline:
        self.db.add(pipeline)
        await self.db.flush()
        await self.db.refresh(pipeline)
        return pipeline

    async def update(self, pipeline: Pipeline) -> Pipeline:
        await self.db.flush()
        await self.db.refresh(pipeline)
        return pipeline

    async def delete(self, pipeline: Pipeline) -> None:
        await self.db.delete(pipeline)
        await self.db.flush()
