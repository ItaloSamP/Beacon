from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.alert_dispatcher import AlertDispatcher
from app.application.detection import AnomalyDetector
from app.application.profiling import CloudProfiler
from app.domain.models import (
    Alert,
    AlertChannel,
    AlertStatus,
    Anomaly,
    AnomalySeverity,
    Pipeline,
    PipelineRun,
    PipelineRunStatus,
)
from app.infrastructure.repositories.datasource_repo import DataSourceRepository
from app.infrastructure.repositories.pipeline_repo import PipelineRepository
from app.infrastructure.repositories.pipeline_run_repo import PipelineRunRepository
from app.shared.exceptions import NotFoundException


class PipelineRunService:
    def __init__(
        self,
        db: AsyncSession,
        pipeline_run_repo: PipelineRunRepository | None = None,
        pipeline_repo: PipelineRepository | None = None,
        datasource_repo: DataSourceRepository | None = None,
        profiler: CloudProfiler | None = None,
        anomaly_detector: AnomalyDetector | None = None,
        alert_dispatcher: AlertDispatcher | None = None,
    ):
        self.db = db
        self.pipeline_run_repo = pipeline_run_repo or PipelineRunRepository(db)
        self.pipeline_repo = pipeline_repo or PipelineRepository(db)
        self.datasource_repo = datasource_repo or DataSourceRepository(db)
        self.profiler = profiler or CloudProfiler()
        self.anomaly_detector = anomaly_detector or AnomalyDetector()
        self.alert_dispatcher = alert_dispatcher

    async def run_pipeline(self, pipeline_id: str) -> PipelineRun:
        pipeline = await self.pipeline_repo.get_by_id(UUID(pipeline_id))
        if not pipeline:
            raise NotFoundException("Pipeline not found")

        pipeline_run = PipelineRun(
            pipeline_id=UUID(pipeline_id),
            status=PipelineRunStatus.success,
            metrics_json={},
            started_at=datetime.now(UTC),
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

            # 1. Profile the data source
            metrics = await self._execute_profiling(pipeline, datasource)

            # 2. Check for connection / config errors from profiling
            if metrics.get("error"):
                return await self._set_run_error(pipeline_run, metrics)

            # 3. Detect anomalies
            anomaly_dicts = await self._detect_anomaly(pipeline, metrics)

            # 4. Persist anomalies and dispatch alerts via AlertDispatcher
            for anomaly_dict in anomaly_dicts:
                anomaly = Anomaly(
                    pipeline_run_id=pipeline_run.id,
                    severity=AnomalySeverity(anomaly_dict["severity"]),
                    type=anomaly_dict["type"],
                    description=anomaly_dict["description"],
                    deviation_details=anomaly_dict["deviation_details"],
                    detected_at=datetime.now(UTC),
                )
                self.db.add(anomaly)
                await self.db.flush()

                # Use AlertDispatcher for threshold-based alert dispatch
                if self.alert_dispatcher is not None:
                    await self.alert_dispatcher.dispatch(
                        anomaly, pipeline_id=pipeline.id
                    )
                else:
                    # Fallback: create alert directly (backward compat)
                    alert = Alert(
                        anomaly_id=anomaly.id,
                        channel=AlertChannel.email,
                        status=AlertStatus.sent,
                        sent_at=datetime.now(UTC),
                    )
                    self.db.add(alert)
                    await self.db.flush()

            # 5. Finalise run status
            status = PipelineRunStatus.warning if anomaly_dicts else PipelineRunStatus.success
            pipeline_run = await self.pipeline_run_repo.update_status(
                pipeline_run.id,
                status,
                metrics_json=metrics,
                finished_at=datetime.now(UTC),
            )
        except (NotFoundException, SQLAlchemyError):
            pipeline_run = await self._set_run_error(pipeline_run)

        return pipeline_run

    async def _set_run_error(
        self,
        pipeline_run: PipelineRun,
        metrics: dict | None = None,
    ) -> PipelineRun:
        """Helper: mark a pipeline run as errored."""
        return await self.pipeline_run_repo.update_status(
            pipeline_run.id,
            PipelineRunStatus.error,
            metrics_json=metrics,
            finished_at=datetime.now(UTC),
        )

    async def _execute_profiling(self, pipeline: Pipeline, datasource) -> dict:
        """Connect to the data source and run profiling (volume / null_check).

        Returns a ``metrics_json``-compatible dict.  On connection or config
        failure the dict carries an ``error`` key instead of raising.
        """
        config = datasource.connection_config or {}
        target_tables: list[str] = (pipeline.config or {}).get("target_tables", [])  # type: ignore[arg-type]
        pipeline_type = pipeline.type.value if hasattr(pipeline.type, "value") else str(pipeline.type)

        return await self.profiler.profile(
            connection_config=config,
            pipeline_type=pipeline_type,
            target_tables=target_tables,
        )

    async def _detect_anomaly(self, pipeline: Pipeline, metrics: dict) -> list[dict]:
        """Run z-score anomaly detection against historical pipeline-run metrics.

        Returns a list of anomaly dicts (empty if data is clean or no
        baseline exists).
        """
        cfg = pipeline.config or {}
        threshold: float = cfg.get("threshold", AnomalyDetector.DEFAULT_THRESHOLD)
        baseline_window: int = cfg.get("baseline_window", AnomalyDetector.DEFAULT_BASELINE_WINDOW)

        return await self.anomaly_detector.detect(
            metrics=metrics,
            pipeline_id=UUID(str(pipeline.id)),
            db=self.db,
            threshold=threshold,
            baseline_window=baseline_window,
        )
