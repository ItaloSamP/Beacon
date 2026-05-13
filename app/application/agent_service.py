from uuid import UUID

from app.domain.models import Agent
from app.infrastructure.repositories.agent_repo import AgentRepository
from app.shared.exceptions import NotFoundException


class AgentService:
    def __init__(self, repo: AgentRepository):
        self.repo = repo

    async def get_by_id(self, id: UUID, user_id: UUID) -> Agent:
        agent = await self.repo.get_by_id(id)
        if not agent or str(agent.user_id) != str(user_id):
            raise NotFoundException("Agent not found")
        return agent

    async def list_by_user(
        self,
        user_id: UUID,
        page: int = 1,
        per_page: int = 50,
        status: str | None = None,
    ) -> tuple[list[Agent], int]:
        return await self.repo.list_by_user(
            user_id=user_id, page=page, per_page=per_page, status=status
        )

    async def create(self, user_id: UUID, data: dict) -> Agent:
        agent = Agent(
            name=data["name"],
            user_id=user_id,
            status=data.get("status", "offline"),
            version=data.get("version"),
        )
        return await self.repo.create(agent)

    async def update(self, id: UUID, user_id: UUID, data: dict) -> Agent:
        agent = await self.repo.get_by_id(id)
        if not agent or str(agent.user_id) != str(user_id):
            raise NotFoundException("Agent not found")

        if "name" in data and data["name"] is not None:
            agent.name = data["name"]
        if "status" in data and data["status"] is not None:
            agent.status = data["status"]
        if "version" in data and data["version"] is not None:
            agent.version = data["version"]

        return await self.repo.update(agent)

    async def delete(self, id: UUID, user_id: UUID) -> None:
        agent = await self.repo.get_by_id(id)
        if not agent or str(agent.user_id) != str(user_id):
            raise NotFoundException("Agent not found")
        await self.repo.delete(agent)
