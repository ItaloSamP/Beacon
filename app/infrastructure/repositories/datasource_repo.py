from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.domain.models import DataSource


class DataSourceRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: UUID) -> DataSource | None:
        result = await self.db.execute(select(DataSource).where(DataSource.id == id))
        return result.scalar_one_or_none()

    async def list(
        self,
        page: int = 1,
        per_page: int = 50,
        type: str | None = None,
        status: str | None = None,
    ) -> tuple[list[DataSource], int]:
        query = select(DataSource)
        count_query = select(func.count(DataSource.id))

        if type:
            query = query.where(DataSource.type == type)
            count_query = count_query.where(DataSource.type == type)
        if status:
            query = query.where(DataSource.status == status)
            count_query = count_query.where(DataSource.status == status)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .order_by(DataSource.created_at.desc())
        )
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def create(self, ds: DataSource) -> DataSource:
        self.db.add(ds)
        await self.db.flush()
        await self.db.refresh(ds)
        return ds

    async def update(self, ds: DataSource) -> DataSource:
        await self.db.flush()
        await self.db.refresh(ds)
        return ds

    async def delete(self, ds: DataSource) -> None:
        await self.db.delete(ds)
        await self.db.flush()
