from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import (
    Anomaly,
    AnomalySeverity,
    Alert,
    AlertChannel,
    AlertStatus,
    Pipeline,
    PipelineRun,
    PipelineRunStatus,
    PipelineType,
)
from app.infrastructure.repositories.pipeline_repo import PipelineRepository
from app.infrastructure.repositories.pipeline_run_repo import PipelineRunRepository
from app.infrastructure.repositories.datasource_repo import DataSourceRepository
from app.shared.exceptions import NotFoundException


class PipelineRunService:
    def __init__(
        self,
        db: AsyncSession,
        pipeline_run_repo: PipelineRunRepository | None = None,
        pipeline_repo: PipelineRepository | None = None,
        datasource_repo: DataSourceRepository | None = None,
    ):
        self.db = db
        self.pipeline_run_repo = pipeline_run_repo or PipelineRunRepository(db)
        self.pipeline_repo = pipeline_repo or PipelineRepository(db)
        self.datasource_repo = datasource_repo or DataSourceRepository(db)

    async def run_pipeline(self, pipeline_id: str) -> PipelineRun:
        pipeline = await self.pipeline_repo.get_by_id(UUID(pipeline_id))
        if not pipeline:
            raise NotFoundException("Pipeline not found")

        pipeline_run = PipelineRun(
            pipeline_id=UUID(pipeline_id),
            status=PipelineRunStatus.success,
            metrics_json={},
            started_at=datetime.now(timezone.utc),
        )
        pipeline_run = await self.pipeline_run_repo.create(pipeline_run)

        return await self._execute_pipeline(pipeline, pipeline_run)

    async def continue_pipeline_run(self, run_id: str) -> PipelineRun:
        pipeline_run = await self.pipeline_run_repo.get_by_id(run_id)
        if not pipeline_run:
            raise NotFoundException("Pipeline run not found")

        pipeline = await self.pipeline_repo.get_by_id(pipeline_run.pipeline_id)
        if not pipeline:
            raise NotFoundException("Pipeline not found")

        return await self._execute_pipeline(pipeline, pipeline_run)

    async def _execute_pipeline(self, pipeline: Pipeline, pipeline_run: PipelineRun) -> PipelineRun:
        try:
            datasource = await self.datasource_repo.get_by_id(pipeline.data_source_id)
            if not datasource:
                raise NotFoundException("Data source not found")

            metrics = await self._execute_profiling(pipeline, datasource)
            anomaly = await self._detect_anomaly(pipeline, metrics)

            if anomaly:
                self.db.add(anomaly)
                await self.db.flush()

                alert = Alert(
                    anomaly_id=anomaly.id,
                    channel=AlertChannel.email,
                    status=AlertStatus.sent,
                    sent_at=datetime.now(timezone.utc),
                )
                self.db.add(alert)
                await self.db.flush()

                pipeline_run = await self.pipeline_run_repo.update_status(
                    pipeline_run.id,
                    PipelineRunStatus.warning,
                    metrics_json=metrics,
                    finished_at=datetime.now(timezone.utc),
                )
            else:
                pipeline_run = await self.pipeline_run_repo.update_status(
                    pipeline_run.id,
                    PipelineRunStatus.success,
                    metrics_json=metrics,
                    finished_at=datetime.now(timezone.utc),
                )
        except Exception:
            pipeline_run = await self.pipeline_run_repo.update_status(
                pipeline_run.id,
                PipelineRunStatus.error,
                finished_at=datetime.now(timezone.utc),
            )

        return pipeline_run

    async def _execute_profiling(self, pipeline: Pipeline, datasource) -> dict:
        # TODO S1: Connect to PostgresConnector from agent.connectors.postgres
        # TODO S1: Execute profiling queries (volume / null_check / schema_change)
        # TODO S1: Use datasource.connection_config for connection details
        return {
            "row_count": 0,
            "profiling_type": pipeline.type.value if hasattr(pipeline.type, "value") else str(pipeline.type),
        }

    async def _detect_anomaly(self, pipeline: Pipeline, metrics: dict) -> Anomaly | None:
        # TODO S1: Load historical runs via pipeline_run_repo.list_by_pipeline
        # TODO S1: Compute z-score for current metrics vs baseline window
        # TODO S1: Return Anomaly with severity if z-score exceeds threshold
        return None
