from uuid import UUID


from app.domain.models import DataSource, Agent
from app.infrastructure.repositories.datasource_repo import DataSourceRepository
from app.shared.exceptions import NotFoundException, BadRequestException


class DataSourceService:
    def __init__(self, repo: DataSourceRepository):
        self.repo = repo

    async def get_by_id(self, id: UUID) -> DataSource:
        ds = await self.repo.get_by_id(id)
        if not ds:
            raise NotFoundException("Data source not found")
        # Eager load agent if linked
        if ds.agent_id:
            await self.repo.db.refresh(ds, ["agent"])
        return ds

    async def list(
        self,
        page: int = 1,
        per_page: int = 50,
        type: str | None = None,
        status: str | None = None,
        agent_id: UUID | None = None,
    ) -> tuple[list[DataSource], int]:
        return await self.repo.list(
            page=page, per_page=per_page, type=type, status=status, agent_id=agent_id
        )

    async def create(self, data: dict, user_id: UUID | None = None) -> DataSource:
        agent_id = data.get("agent_id")
        if agent_id:
            await self._validate_agent(agent_id, user_id)

        ds = DataSource(
            name=data["name"],
            type=data["type"],
            agent_id=agent_id,
            connection_config=data.get("connection_config", {}),
            status=data.get("status", "active"),
        )
        return await self.repo.create(ds)

    async def update(self, id: UUID, data: dict, user_id: UUID | None = None) -> DataSource:
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
        if "agent_id" in data:
            agent_id = data["agent_id"]
            if agent_id is not None:
                await self._validate_agent(agent_id, user_id)
            ds.agent_id = agent_id

        return await self.repo.update(ds)

    async def delete(self, id: UUID) -> None:
        ds = await self.repo.get_by_id(id)
        if not ds:
            raise NotFoundException("Data source not found")
        await self.repo.delete(ds)

    async def _validate_agent(self, agent_id: UUID, user_id: UUID | None) -> None:
        """Verify the agent exists and belongs to the given user."""
        from sqlalchemy import select

        result = await self.repo.db.execute(select(Agent).where(Agent.id == agent_id))
        agent = result.scalar_one_or_none()
        if not agent:
            raise BadRequestException("Agent not found")
        if user_id and str(agent.user_id) != str(user_id):
            raise BadRequestException("Agent not found")
