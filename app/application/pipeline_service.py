from __future__ import annotations

from uuid import UUID

from app.domain.models import Pipeline
from app.infrastructure.repositories.pipeline_repo import PipelineRepository
from app.shared.exceptions import NotFoundException


class PipelineService:
    def __init__(self, repo: PipelineRepository):
        self.repo = repo

    async def get_by_id(self, id: UUID) -> Pipeline:
        pipeline = await self.repo.get_by_id(id)
        if not pipeline:
            raise NotFoundException("Pipeline not found")
        return pipeline

    async def list(
        self,
        page: int = 1,
        per_page: int = 50,
        type: str | None = None,
        data_source_id: UUID | None = None,
        enabled: bool | None = None,
    ) -> tuple[list[Pipeline], int]:
        return await self.repo.list(
            page=page,
            per_page=per_page,
            type=type,
            data_source_id=data_source_id,
            enabled=enabled,
        )

    async def create(self, data: dict) -> Pipeline:
        pipeline = Pipeline(
            name=data["name"],
            type=data["type"],
            data_source_id=data["data_source_id"],
            schedule=data.get("schedule"),
            config=data.get("config", {}),
            enabled=data.get("enabled", True),
        )
        return await self.repo.create(pipeline)

    async def update(self, id: UUID, data: dict) -> Pipeline:
        pipeline = await self.repo.get_by_id(id)
        if not pipeline:
            raise NotFoundException("Pipeline not found")

        if "name" in data and data["name"] is not None:
            pipeline.name = data["name"]
        if "type" in data and data["type"] is not None:
            pipeline.type = data["type"]
        if "schedule" in data:
            pipeline.schedule = data["schedule"]
        if "config" in data and data["config"] is not None:
            pipeline.config = data["config"]
        if "enabled" in data and data["enabled"] is not None:
            pipeline.enabled = data["enabled"]

        return await self.repo.update(pipeline)

    async def delete(self, id: UUID) -> None:
        pipeline = await self.repo.get_by_id(id)
        if not pipeline:
            raise NotFoundException("Pipeline not found")
        await self.repo.delete(pipeline)
