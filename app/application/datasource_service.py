from uuid import UUID

from app.domain.models import DataSource
from app.infrastructure.repositories.datasource_repo import DataSourceRepository
from app.shared.exceptions import NotFoundException


class DataSourceService:
    def __init__(self, repo: DataSourceRepository):
        self.repo = repo

    async def get_by_id(self, id: UUID) -> DataSource:
        ds = await self.repo.get_by_id(id)
        if not ds:
            raise NotFoundException("Data source not found")
        return ds

    async def list(
        self,
        page: int = 1,
        per_page: int = 50,
        type: str | None = None,
        status: str | None = None,
    ) -> tuple[list[DataSource], int]:
        return await self.repo.list(page=page, per_page=per_page, type=type, status=status)

    async def create(self, data: dict) -> DataSource:
        ds = DataSource(
            name=data["name"],
            type=data["type"],
            connection_config=data.get("connection_config", {}),
            status=data.get("status", "active"),
        )
        return await self.repo.create(ds)

    async def update(self, id: UUID, data: dict) -> DataSource:
        ds = await self.repo.get_by_id(id)
        if not ds:
            raise NotFoundException("Data source not found")

        if "name" in data and data["name"] is not None:
            ds.name = data["name"]
        if "type" in data and data["type"] is not None:
            ds.type = data["type"]
        if "connection_config" in data and data["connection_config"] is not None:
            ds.connection_config = data["connection_config"]
        if "status" in data and data["status"] is not None:
            ds.status = data["status"]

        return await self.repo.update(ds)

    async def delete(self, id: UUID) -> None:
        ds = await self.repo.get_by_id(id)
        if not ds:
            raise NotFoundException("Data source not found")
        await self.repo.delete(ds)
