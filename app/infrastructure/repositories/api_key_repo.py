from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.domain.models import ApiKey


class ApiKeyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_key_hash(self, key_hash: str) -> ApiKey | None:
        result = await self.db.execute(select(ApiKey).where(ApiKey.key_hash == key_hash))
        return result.scalar_one_or_none()

    async def get_by_id(self, id: UUID) -> ApiKey | None:
        result = await self.db.execute(select(ApiKey).where(ApiKey.id == id))
        return result.scalar_one_or_none()

    async def list_by_user(self, user_id: UUID) -> list[ApiKey]:
        result = await self.db.execute(
            select(ApiKey).where(ApiKey.user_id == user_id).order_by(ApiKey.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, api_key: ApiKey) -> ApiKey:
        self.db.add(api_key)
        await self.db.flush()
        await self.db.refresh(api_key)
        return api_key

    async def update(self, api_key: ApiKey) -> ApiKey:
        await self.db.flush()
        await self.db.refresh(api_key)
        return api_key
