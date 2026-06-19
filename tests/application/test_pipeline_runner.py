"""
Unit tests for PipelineRunService — real pipeline execution logic.

Tests verify:
- Profiling returns real metrics (via mocked CloudProfiler)
- Anomaly detection with z-score computation (via mocked AnomalyDetector)
- Connection failure → status=error
- Empty historical data → no anomalies
- Clean data → status=success, no anomalies
- PipelineRun status transitions (error, warning, success)
- Anomaly persistence and alert creation
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.application.pipeline_runner import PipelineRunService
from app.domain.models import (
    PipelineRunStatus,
    PipelineType,
)


def utcnow():
    return datetime.now(UTC)


# -----------------------------------------------------------------
# Sample metrics fixture (realistic ProfileRunner output)
# -----------------------------------------------------------------

@pytest.fixture
def sample_metrics():
    """A realistic metrics_json dict matching ProfileRunner.to_dict() output."""
    return {
        "profiled_at": utcnow().isoformat(),
        "profiling_type": "volume",
        "tables": {
            "public.orders": {
                "schema": {
                    "table": "public.orders",
                    "columns": [
                        {"name": "id", "type": "integer", "nullable": False},
                        {"name": "total", "type": "numeric", "nullable": True},
                    ],
                    "column_count": 2,
                    "profiled_at": utcnow().isoformat(),
                },
                "volume": {
                    "table": "public.orders",
                    "row_count": 15420,
                    "profiled_at": utcnow().isoformat(),
                },
                "nulls": {
                    "table": "public.orders",
                    "null_percentages": {"total": 0.03},
                    "profiled_at": utcnow().isoformat(),
                },
            }
        },
        "errors": [],
        "timing": {"schema_ms": 12.5, "volume_ms": 8.2, "nulls_ms": 45.1},
    }


@pytest.fixture
def sample_metrics_null_check():
    """Metrics for a null_check pipeline."""
    return {
        "profiled_at": utcnow().isoformat(),
        "profiling_type": "null_check",
        "tables": {
            "public.users": {
                "nulls": {
                    "table": "public.users",
                    "null_percentages": {"email": 0.0, "phone": 0.15},
                    "profiled_at": utcnow().isoformat(),
                }
            }
        },
        "errors": [],
        "timing": {"schema_ms": 3.0, "volume_ms": 1.0, "nulls_ms": 22.0},
    }


@pytest.fixture
def error_metrics():
    """Metrics dict representing a connection failure."""
    return {
        "error": "connection_failed",
        "message": "could not connect to server",
        "profiling_type": "volume",
        "tables": {},
        "errors": [{"table": "*", "step": "connect", "error": "could not connect to server"}],
        "timing": {"schema_ms": 0.0, "volume_ms": 0.0, "nulls_ms": 0.0},
    }


# -----------------------------------------------------------------
# Mock helpers
# -----------------------------------------------------------------

def make_mock_pipeline(pipeline_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", **kwargs):
    """Create a MagicMock Pipeline with sensible defaults."""
    pipe = MagicMock()
    pipe.id = pipeline_id
    pipe.name = kwargs.get("name", "Test Pipeline")
    pipe.type = kwargs.get("type", PipelineType.volume)
    pipe.data_source_id = kwargs.get("data_source_id", "ds-uuid-001")
    pipe.config = kwargs.get("config", {})
    pipe.enabled = kwargs.get("enabled", True)
    return pipe


def make_mock_datasource(ds_id="ds-uuid-001"):
    """Create a MagicMock DataSource."""
    ds = MagicMock()
    ds.id = ds_id
    ds.connection_config = {
        "host": "localhost",
        "port": 5432,
        "database": "testdb",
        "username": "testuser",
        "password": "testpass",
    }
    return ds


# -----------------------------------------------------------------
# Service fixture
# -----------------------------------------------------------------

class TestPipelineRunService:
    """Unit tests for PipelineRunService with mocked profiler and detector."""

    @pytest.fixture
    def mock_db(self):
        """Mock async DB session.  ``add`` and ``flush`` are sync methods."""
        db = AsyncMock()
        db.add = MagicMock()          # sync — stages objects
        db.flush = AsyncMock()        # async — sends to DB
        return db

    @pytest.fixture
    def mock_pipeline_repo(self):
        """Mock Pipeline repository."""
        return AsyncMock()

    @pytest.fixture
    def mock_run_repo(self):
        """Mock PipelineRun repository — returns the run on create."""
        repo = AsyncMock()
        repo.create = AsyncMock(side_effect=lambda run: run)
        return repo

    @pytest.fixture
    def mock_datasource_repo(self):
        """Mock DataSource repository."""
        return AsyncMock()

    @pytest.fixture
    def mock_profiler(self):
        """Mock CloudProfiler — returns sample_metrics by default."""
        profiler = AsyncMock()
        return profiler

    @pytest.fixture
    def mock_detector(self):
        """Mock AnomalyDetector — returns empty list (no anomalies) by default."""
        detector = AsyncMock()
        detector.detect = AsyncMock(return_value=[])
        return detector

    @pytest.fixture
    def service(
        self, mock_db, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, mock_detector,
    ):
        """Create PipelineRunService with all dependencies mocked."""
        return PipelineRunService(
            db=mock_db,
            pipeline_run_repo=mock_run_repo,
            pipeline_repo=mock_pipeline_repo,
            datasource_repo=mock_datasource_repo,
            profiler=mock_profiler,
            anomaly_detector=mock_detector,
        )

    @pytest.fixture
    def sample_pipeline(self):
        """Sample volume pipeline."""
        return make_mock_pipeline()

    @pytest.fixture
    def sample_datasource(self):
        """Sample datasource."""
        return make_mock_datasource()

    # ============================================================
    # Full execution flow
    # ============================================================

    @pytest.mark.asyncio
    async def test_run_pipeline_creates_pipeline_run(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, sample_pipeline,
        sample_datasource, sample_metrics,
    ):
        """run_pipeline should create a PipelineRun record."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        result = await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.create.assert_called_once()
        assert result is not None

    @pytest.mark.asyncio
    async def test_run_pipeline_fetches_datasource(
        self, service, mock_pipeline_repo, mock_datasource_repo,
        mock_profiler, sample_pipeline, sample_datasource, sample_metrics,
    ):
        """run_pipeline should fetch the pipeline's data source."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        await service.run_pipeline(sample_pipeline.id)

        mock_datasource_repo.get_by_id.assert_called_once_with(
            sample_pipeline.data_source_id
        )

    @pytest.mark.asyncio
    async def test_run_pipeline_updates_status_on_completion(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, sample_pipeline,
        sample_datasource, sample_metrics,
    ):
        """run_pipeline should update pipeline run status after execution."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()

    @pytest.mark.asyncio
    async def test_run_pipeline_returns_pipeline_run(
        self, service, mock_pipeline_repo, mock_datasource_repo,
        mock_profiler, sample_pipeline, sample_datasource, sample_metrics,
    ):
        """run_pipeline should return a PipelineRun object."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        result = await service.run_pipeline(sample_pipeline.id)

        assert result is not None
        assert hasattr(result, 'id')
        assert hasattr(result, 'status')

    # ============================================================
    # Status transitions
    # ============================================================

    @pytest.mark.asyncio
    async def test_run_sets_status_success_on_clean_data(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, mock_detector,
        sample_pipeline, sample_datasource, sample_metrics,
    ):
        """On clean data (no anomalies), status should be 'success'."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)
        mock_detector.detect = AsyncMock(return_value=[])

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.success

    @pytest.mark.asyncio
    async def test_run_sets_status_warning_on_anomalies(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, mock_detector,
        mock_db, sample_pipeline, sample_datasource, sample_metrics,
    ):
        """When anomalies are detected, status should be 'warning'."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)
        mock_detector.detect = AsyncMock(return_value=[
            {
                "type": "volume",
                "severity": "medium",
                "description": "Volume anomaly in public.orders: z=3.50",
                "deviation_details": {
                    "table": "public.orders",
                    "metric": "row_count",
                    "current_value": 50000,
                    "baseline_mean": 15000,
                    "baseline_stddev": 10000,
                    "z_score": 3.50,
                    "threshold": 2.0,
                    "baseline_n": 10,
                },
            }
        ])

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.warning

    @pytest.mark.asyncio
    async def test_run_sets_status_error_on_exception(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, sample_pipeline,
    ):
        """When an exception occurs, status should transition to 'error'."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(
            side_effect=SQLAlchemyError("Database unreachable")
        )

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.error

    @pytest.mark.asyncio
    async def test_connection_failure_sets_error(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, sample_pipeline,
        sample_datasource, error_metrics,
    ):
        """Connection failure (error in metrics) → status=error with metrics saved."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=error_metrics)

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.error
        # Error metrics should be preserved
        assert call_args[1].get("metrics_json") == error_metrics

    # ============================================================
    # Profiling output
    # ============================================================

    @pytest.mark.asyncio
    async def test_profiling_returns_real_metrics(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, sample_pipeline,
        sample_datasource, sample_metrics,
    ):
        """Profiling should return metrics_json with tables and timing data."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        await service.run_pipeline(sample_pipeline.id)

        # Profiler was called with correct args
        mock_profiler.profile.assert_called_once()
        call_kwargs = mock_profiler.profile.call_args.kwargs
        assert call_kwargs["connection_config"] == sample_datasource.connection_config
        assert call_kwargs["pipeline_type"] == "volume"

        # Metrics are propagated to the update
        update_kwargs = mock_run_repo.update_status.call_args.kwargs
        assert update_kwargs["metrics_json"] is not None
        assert update_kwargs["metrics_json"]["tables"] == sample_metrics["tables"]

    @pytest.mark.asyncio
    async def test_profiling_passes_target_tables_from_config(
        self, service, mock_pipeline_repo, mock_profiler,
        sample_datasource,
    ):
        """Pipeline config's target_tables should be forwarded to the profiler."""
        pipe = make_mock_pipeline(config={"target_tables": ["public.orders", "public.users"]})
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=pipe)
        service.datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value={"tables": {}, "errors": []})

        await service.run_pipeline(pipe.id)

        call_kwargs = mock_profiler.profile.call_args.kwargs
        assert call_kwargs["target_tables"] == ["public.orders", "public.users"]

    @pytest.mark.asyncio
    async def test_profiling_handles_null_check_type(
        self, service, mock_pipeline_repo, mock_profiler,
        sample_datasource, sample_metrics_null_check,
    ):
        """Null check pipeline type should be handled."""
        pipe = make_mock_pipeline(type=PipelineType.null_check)
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=pipe)
        service.datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics_null_check)

        await service.run_pipeline(pipe.id)

        call_kwargs = mock_profiler.profile.call_args.kwargs
        assert call_kwargs["pipeline_type"] == "null_check"

    # ============================================================
    # Anomaly detection
    # ============================================================

    @pytest.mark.asyncio
    async def test_detect_called_with_pipeline_id(
        self, service, mock_pipeline_repo, mock_datasource_repo,
        mock_profiler, mock_detector, sample_pipeline,
        sample_datasource, sample_metrics,
    ):
        """Anomaly detection should be called with the correct pipeline ID."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        await service.run_pipeline(sample_pipeline.id)

        mock_detector.detect.assert_called_once()
        call_kwargs = mock_detector.detect.call_args.kwargs
        assert call_kwargs["pipeline_id"] is not None
        assert call_kwargs["metrics"] == sample_metrics

    @pytest.mark.asyncio
    async def test_anomalies_persist_with_alerts(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, mock_detector,
        mock_db, sample_pipeline, sample_datasource, sample_metrics,
    ):
        """Detected anomalies should be persisted as Anomaly + Alert records."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)
        mock_detector.detect = AsyncMock(return_value=[
            {
                "type": "null_check",
                "severity": "high",
                "description": "Null pct anomaly in public.orders.total: z=4.20",
                "deviation_details": {
                    "table": "public.orders",
                    "metric": "null_pct.total",
                    "current_value": 0.5,
                    "baseline_mean": 0.03,
                    "baseline_stddev": 0.1,
                    "z_score": 4.70,
                    "threshold": 2.0,
                    "baseline_n": 5,
                },
            }
        ])

        await service.run_pipeline(sample_pipeline.id)

        # Anomaly + Alert were added
        assert mock_db.add.call_count >= 2
        # Status is warning
        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.warning

    @pytest.mark.asyncio
    async def test_receives_threshold_from_pipeline_config(
        self, service, mock_pipeline_repo, mock_datasource_repo,
        mock_profiler, mock_detector, sample_datasource, sample_metrics,
    ):
        """Pipeline config threshold should be passed to the anomaly detector."""
        pipe = make_mock_pipeline(config={"threshold": 3.0, "baseline_window": 50})
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=pipe)
        service.datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        await service.run_pipeline(pipe.id)

        call_kwargs = mock_detector.detect.call_args.kwargs
        assert call_kwargs["threshold"] == 3.0
        assert call_kwargs["baseline_window"] == 50

    # ============================================================
    # Error handling
    # ============================================================

    @pytest.mark.asyncio
    async def test_pipeline_not_found(
        self, service, mock_pipeline_repo,
    ):
        """Running a non-existent pipeline should raise NotFoundException."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(Exception) as exc_info:
            await service.run_pipeline("00000000-0000-0000-0000-000000000000")

        error_msg = str(exc_info.value).lower()
        assert any(
            word in error_msg for word in ["not found", "missing", "404"]
        ), f"Expected 'not found' error, got: {exc_info.value}"

    @pytest.mark.asyncio
    async def test_datasource_not_found_sets_error(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, sample_pipeline,
    ):
        """When datasource not found, run completes with error status."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=None)

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.error

    # ============================================================
    # Metrics propagation
    # ============================================================

    @pytest.mark.asyncio
    async def test_metrics_json_in_update_on_success(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, sample_pipeline,
        sample_datasource, sample_metrics,
    ):
        """update_status should include metrics_json on successful runs."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        await service.run_pipeline(sample_pipeline.id)

        call_kwargs = mock_run_repo.update_status.call_args
        assert call_kwargs is not None
        assert call_kwargs[1].get("metrics_json") is not None
        assert call_kwargs[1].get("finished_at") is not None

    # ============================================================
    # PipelineRun timestamps
    # ============================================================

    @pytest.mark.asyncio
    async def test_run_pipeline_stores_started_at(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, sample_pipeline,
        sample_datasource, sample_metrics,
    ):
        """The PipelineRun should record started_at timestamp."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        await service.run_pipeline(sample_pipeline.id)

        args = mock_run_repo.create.call_args
        created_run = args[0][0]
        assert created_run is not None
        assert created_run.started_at is not None

    @pytest.mark.asyncio
    async def test_run_pipeline_stores_finished_at(
        self, service, mock_pipeline_repo, mock_run_repo,
        mock_datasource_repo, mock_profiler, sample_pipeline,
        sample_datasource, sample_metrics,
    ):
        """On completion, finished_at should be recorded."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()
        call_kwargs = mock_run_repo.update_status.call_args
        assert call_kwargs[1].get("finished_at") is not None

    # ============================================================
    # Direct await
    # ============================================================

    @pytest.mark.asyncio
    async def test_run_pipeline_can_be_awaited_directly(
        self, service, mock_pipeline_repo, mock_datasource_repo,
        mock_profiler, sample_pipeline, sample_datasource, sample_metrics,
    ):
        """run_pipeline should be awaitable directly (not just background)."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=sample_datasource)
        mock_profiler.profile = AsyncMock(return_value=sample_metrics)

        result = await service.run_pipeline(sample_pipeline.id)

        assert result is not None
        assert hasattr(result, 'id')
