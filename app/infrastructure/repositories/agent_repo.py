from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.domain.models import Agent


class AgentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, id: UUID) -> Agent | None:
        result = await self.db.execute(select(Agent).where(Agent.id == id))
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: UUID,
        page: int = 1,
        per_page: int = 50,
        status: str | None = None,
    ) -> tuple[list[Agent], int]:
        query = select(Agent).where(Agent.user_id == user_id)
        count_query = select(func.count(Agent.id)).where(Agent.user_id == user_id)

        if status:
            query = query.where(Agent.status == status)
            count_query = count_query.where(Agent.status == status)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        query = (
            query.offset((page - 1) * per_page)
            .limit(per_page)
            .order_by(Agent.created_at.desc())
        )
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def create(self, agent: Agent) -> Agent:
        self.db.add(agent)
        await self.db.flush()
        await self.db.refresh(agent)
        return agent

    async def update(self, agent: Agent) -> Agent:
        await self.db.flush()
        await self.db.refresh(agent)
        return agent

    async def delete(self, agent: Agent) -> None:
        await self.db.delete(agent)
        await self.db.flush()
