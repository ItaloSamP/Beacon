from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.domain.models import AgentToken


class AgentTokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, agent_id: UUID, token_hash: str, token_prefix: str, name: str = "Default") -> AgentToken:
        token = AgentToken(agent_id=agent_id, token_hash=token_hash, token_prefix=token_prefix, name=name)
        self.db.add(token)
        await self.db.flush()
        return token

    async def get_by_token_hash(self, token_hash: str) -> AgentToken | None:
        result = await self.db.execute(
            select(AgentToken).where(AgentToken.token_hash == token_hash).options(selectinload(AgentToken.agent))
        )
        return result.scalar_one_or_none()

    async def list_by_agent(self, agent_id: UUID) -> list[AgentToken]:
        result = await self.db.execute(
            select(AgentToken).where(AgentToken.agent_id == agent_id).order_by(AgentToken.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_last_used(self, token_id: UUID) -> None:
        from datetime import datetime, timezone
        token = await self.db.get(AgentToken, token_id)
        if token:
            token.last_used_at = datetime.now(timezone.utc)
            await self.db.flush()

    async def delete(self, token_id: UUID) -> None:
        token = await self.db.get(AgentToken, token_id)
        if token:
            self.db.delete(token)
            await self.db.flush()
