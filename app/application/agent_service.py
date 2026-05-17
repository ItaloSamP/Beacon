from uuid import UUID

from app.domain.models import Agent
from app.infrastructure.repositories.agent_repo import AgentRepository
from app.infrastructure.repositories.agent_token_repo import AgentTokenRepository
from app.infrastructure.security import generate_agent_token
from app.shared.exceptions import NotFoundException


class AgentService:
    def __init__(self, repo: AgentRepository, token_repo: AgentTokenRepository | None = None):
        self.repo = repo
        self.token_repo = token_repo

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

    async def create_agent_token(self, agent_id: UUID, name: str = "Default") -> tuple[str, object]:
        """Generate and persist an agent token. Returns (full_token, token_obj)."""
        if not self.token_repo:
            raise ValueError("AgentTokenRepository is not available")
        full_token, token_hash, token_prefix = generate_agent_token()
        token_obj = await self.token_repo.create(
            agent_id=agent_id,
            token_hash=token_hash,
            token_prefix=token_prefix,
            name=name,
        )
        return full_token, token_obj

    async def list_tokens(self, agent_id: UUID, user_id: UUID) -> list:
        """List tokens for an agent (belonging to the user)."""
        agent = await self.get_by_id(agent_id, user_id)
        if not self.token_repo:
            raise ValueError("AgentTokenRepository is not available")
        return await self.token_repo.list_by_agent(agent.id)

    async def revoke_token(self, token_id: UUID, agent_id: UUID, user_id: UUID) -> None:
        """Revoke (delete) a token. Verifies the agent belongs to the user first."""
        agent = await self.get_by_id(agent_id, user_id)
        if not self.token_repo:
            raise ValueError("AgentTokenRepository is not available")
        # Verify the token belongs to this agent
        tokens = await self.token_repo.list_by_agent(agent.id)
        token_ids = [str(t.id) for t in tokens]
        if str(token_id) not in token_ids:
            raise NotFoundException("Token not found")
        await self.token_repo.delete(token_id)

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

    async def heartbeat(self, agent_id: UUID) -> Agent:
        """Update agent heartbeat (status=online, last_heartbeat_at=now)."""
        from datetime import datetime, timezone
        from app.domain.models import AgentStatus
        agent = await self.repo.get_by_id(agent_id)
        if not agent:
            raise NotFoundException("Agent not found")
        agent.status = AgentStatus.online
        agent.last_heartbeat_at = datetime.now(timezone.utc)
        return await self.repo.update(agent)

    async def get_config_for_agent(self, agent_id: UUID) -> dict:
        """Get full config for an agent (self-config endpoint)."""
        agent = await self.repo.get_by_id(agent_id)
        if not agent:
            raise NotFoundException("Agent not found")
        return agent
