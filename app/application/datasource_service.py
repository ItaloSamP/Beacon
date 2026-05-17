from __future__ import annotations

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
        # Decrypt connection_config for detail view
        ds.connection_config = self._decrypt_config_fields(ds.connection_config)
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

        # Encrypt connection_config before storing
        connection_config = data.get("connection_config", {})
        encrypted_config = self._encrypt_config_fields(connection_config)

        ds = DataSource(
            name=data["name"],
            type=data["type"],
            agent_id=agent_id,
            connection_config=encrypted_config,
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
            ds.connection_config = self._encrypt_config_fields(data["connection_config"])
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

    def _encrypt_config_fields(self, config: dict) -> dict:
        """Encrypt connection_config for storage. Returns dict with _encrypted key."""
        from app.infrastructure.crypto import encrypt_config
        try:
            encrypted = encrypt_config(config)
            return {"_encrypted": encrypted}
        except ValueError:
            # FERNET_KEY not set — store as plain (dev/test)
            return config

    def _decrypt_config_fields(self, config: dict) -> dict:
        """Decrypt connection_config if it's an encrypted wrapper."""
        if isinstance(config, dict) and "_encrypted" in config and len(config) == 1:
            from app.infrastructure.crypto import decrypt_config
            try:
                return decrypt_config(config["_encrypted"])
            except Exception:
                # If decryption fails, return as-is
                return config
        return config

    async def get_config_for_agent(self, agent_id: UUID) -> list[dict]:
        """Get all datasources for an agent with decrypted connection_config."""
        from sqlalchemy import select

        result = await self.repo.db.execute(
            select(DataSource).where(DataSource.agent_id == agent_id)
        )
        datasources = list(result.scalars().all())

        return [
            {
                "id": str(ds.id),
                "name": ds.name,
                "type": ds.type.value if hasattr(ds.type, "value") else str(ds.type),
                "connection_config": self._decrypt_config_fields(ds.connection_config or {}),
                "status": ds.status.value if hasattr(ds.status, "value") else str(ds.status),
            }
            for ds in datasources
        ]

    async def get_by_agent_id(self, agent_id: UUID) -> list[DataSource]:
        """Get datasources by agent_id."""
        from sqlalchemy import select

        result = await self.repo.db.execute(
            select(DataSource).where(DataSource.agent_id == agent_id)
        )
        return list(result.scalars().all())
