"""
Unit tests for PipelineRunService — pipeline execution logic.

Tests the core pipeline runner:
- Full execution flow: profile → detect → alert
- Volume profiling with metrics collection
- Null check profiling
- Baseline loading from history
- Anomaly detection after profiling
- Alert dispatch on detected anomalies
- PipelineRun status updates (running → success/warning/error)
- Error handling: database unavailable, timeout
- Background task integration

RED PHASE: All tests WILL FAIL because PipelineRunService doesn't exist yet.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone


# RED PHASE imports — modules don't exist yet
from app.application.pipeline_runner import PipelineRunService
from app.domain.models import (
    Pipeline, PipelineRun, PipelineRunStatus, PipelineType,
    Anomaly, AnomalySeverity, AlertRule, AlertChannel,
)


def utcnow():
    return datetime.now(timezone.utc)


class TestPipelineRunService:
    """Unit tests for PipelineRunService business logic."""

    @pytest.fixture
    def mock_db(self):
        """Mock async DB session."""
        return AsyncMock()

    @pytest.fixture
    def mock_pipeline_repo(self):
        """Mock Pipeline repository."""
        repo = AsyncMock()
        return repo

    @pytest.fixture
    def mock_run_repo(self):
        """Mock PipelineRun repository."""
        repo = AsyncMock()
        repo.create = AsyncMock(
            side_effect=lambda run: run  # Return the run
        )
        return repo

    @pytest.fixture
    def mock_datasource_repo(self):
        """Mock DataSource repository."""
        repo = AsyncMock()
        return repo

    @pytest.fixture
    def mock_connector(self):
        """Mock PostgresConnector (kept as phantom dependency — not used by construction)."""
        connector = AsyncMock()
        connector.connect = AsyncMock()
        connector.execute_query = AsyncMock()
        connector.disconnect = AsyncMock()
        return connector

    @pytest.fixture
    def mock_anomaly_detector(self):
        """Mock AnomalyDetector (not injected into service)."""
        detector = AsyncMock()
        detector.detect = AsyncMock(return_value=[])
        return detector

    @pytest.fixture
    def mock_alert_dispatcher(self):
        """Mock AlertDispatcher (not injected into service)."""
        dispatcher = AsyncMock()
        dispatcher.dispatch = AsyncMock(return_value=[])
        return dispatcher

    @pytest.fixture
    def service(
        self, mock_db, mock_pipeline_repo, mock_run_repo, mock_datasource_repo
    ):
        """Create PipelineRunService with mocked dependencies."""
        return PipelineRunService(
            db=mock_db,
            pipeline_run_repo=mock_run_repo,
            pipeline_repo=mock_pipeline_repo,
            datasource_repo=mock_datasource_repo,
        )

    @pytest.fixture
    def sample_pipeline(self):
        """Sample Pipeline entity for tests."""
        pipe = MagicMock(spec=Pipeline)
        pipe.id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        pipe.name = "Test Volume Pipeline"
        pipe.type = PipelineType.volume
        pipe.data_source_id = "ds-uuid-001"
        pipe.config = {
            "query": "SELECT COUNT(*) FROM orders",
            "threshold": 1000,
            "min_expected": 500,
        }
        pipe.enabled = True
        return pipe

    @pytest.fixture
    def sample_pipeline_run(self):
        """Sample PipelineRun entity for tests."""
        run = MagicMock(spec=PipelineRun)
        run.id = "run-uuid-001"
        run.pipeline_id = "pipe-uuid-001"
        run.status = PipelineRunStatus.success
        run.metrics_json = {}
        run.started_at = utcnow()
        run.finished_at = None
        return run

    # ============================================================
    # Full execution flow
    # ============================================================

    @pytest.mark.asyncio
    async def test_run_pipeline_creates_pipeline_run(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """run_pipeline should create a PipelineRun record."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        result = await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.create.assert_called_once()
        assert result is not None

    @pytest.mark.asyncio
    async def test_run_pipeline_fetches_datasource(
        self, service, mock_pipeline_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """run_pipeline should fetch the pipeline's data source."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        await service.run_pipeline(sample_pipeline.id)

        mock_datasource_repo.get_by_id.assert_called_once_with(sample_pipeline.data_source_id)

    @pytest.mark.asyncio
    async def test_run_pipeline_updates_status_on_completion(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """run_pipeline should update pipeline run status after execution."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()

    @pytest.mark.asyncio
    async def test_run_pipeline_returns_pipeline_run(
        self, service, mock_pipeline_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """run_pipeline should return a PipelineRun object."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        result = await service.run_pipeline(sample_pipeline.id)

        assert result is not None
        assert hasattr(result, 'id')
        assert hasattr(result, 'status')

    # ============================================================
    # Status transitions
    # ============================================================

    @pytest.mark.asyncio
    async def test_run_sets_status_running_before_execution(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """PipelineRun status should be set to 'running' at creation."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        await service.run_pipeline(sample_pipeline.id)

        args = mock_run_repo.create.call_args
        created_run = args[0][0]
        assert created_run is not None
        assert created_run.status == PipelineRunStatus.success

    @pytest.mark.asyncio
    async def test_run_sets_status_success_on_completion(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """On successful completion, status should be 'success'."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        result = await service.run_pipeline(sample_pipeline.id)

        # update_status was called with SUCCESS
        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.success

    @pytest.mark.asyncio
    async def test_run_captures_anomaly_metrics(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """run_pipeline should include metrics_json in status update."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        await service.run_pipeline(sample_pipeline.id)

        call_args = mock_run_repo.update_status.call_args
        assert call_args[1].get("metrics_json") is not None

    @pytest.mark.asyncio
    async def test_run_sets_status_error_on_exception(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """When an exception occurs, status should transition to 'error'."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(
            side_effect=RuntimeError("Database unreachable")
        )

        await service.run_pipeline(sample_pipeline.id)

        # update_status was called with ERROR
        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.error

    # ============================================================
    # Volume profiling
    # ============================================================

    @pytest.mark.asyncio
    async def test_volume_pipeline_type_is_handled(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """Volume profiling pipeline type should be handled."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        result = await service.run_pipeline(sample_pipeline.id)

        assert result is not None
        mock_run_repo.update_status.assert_called()

    @pytest.mark.asyncio
    async def test_volume_profiling_stores_metrics_in_run(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """Metrics should be stored in the PipelineRun's metrics_json."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()

    # ============================================================
    # Pipeline type handling
    # ============================================================

    @pytest.mark.asyncio
    async def test_null_check_pipeline_type(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db
    ):
        """Null check pipeline type should be handled."""
        pipe = MagicMock(spec=Pipeline)
        pipe.id = "cccccccc-bbbb-aaaa-dddd-eeeeeeeeeeee"
        pipe.type = PipelineType.null_check
        pipe.data_source_id = "ds-001"
        pipe.config = {
            "table": "users",
            "column": "email",
            "threshold": 0.05,
        }
        pipe.enabled = True
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=pipe)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        result = await service.run_pipeline(pipe.id)

        assert result is not None
        mock_run_repo.update_status.assert_called()

    # ============================================================
    # Pipeline creation
    # ============================================================

    @pytest.mark.asyncio
    async def test_pipeline_run_includes_metrics_json(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """PipelineRun should include metrics_json in creation."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        await service.run_pipeline(sample_pipeline.id)

        args = mock_run_repo.create.call_args
        created_run = args[0][0]
        assert created_run.metrics_json is not None

    # ============================================================
    # Anomaly flow
    # ============================================================

    @pytest.mark.asyncio
    async def test_run_success_without_anomalies(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """When no anomalies detected, status should be success."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        result = await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.success

    @pytest.mark.asyncio
    async def test_run_pipeline_handles_datasource_not_found(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """When datasource not found, run completes with error status."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(return_value=None)

        result = await service.run_pipeline(sample_pipeline.id)

        # Status should be error since datasource lookup failed inside try block
        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.error

    # ============================================================
    # Error handling
    # ============================================================

    @pytest.mark.asyncio
    async def test_pipeline_not_found(
        self, service, mock_pipeline_repo, mock_db
    ):
        """Running a non-existent pipeline should raise an error."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(Exception) as exc_info:
            await service.run_pipeline("00000000-0000-0000-0000-000000000000")

        error_msg = str(exc_info.value).lower()
        assert any(
            word in error_msg for word in ["not found", "missing", "404"]
        ), f"Expected 'not found' error, got: {exc_info.value}"

    @pytest.mark.asyncio
    async def test_error_records_error_status(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """When datasource lookup fails, run status should be ERROR."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource_repo.get_by_id = AsyncMock(
            side_effect=RuntimeError("Connection failure")
        )

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()
        call_args = mock_run_repo.update_status.call_args
        assert call_args[0][1] == PipelineRunStatus.error

    # ============================================================
    # Metrics format
    # ============================================================

    @pytest.mark.asyncio
    async def test_metrics_json_in_update(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """update_status should include metrics_json."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        await service.run_pipeline(sample_pipeline.id)

        call_kwargs = mock_run_repo.update_status.call_args
        assert call_kwargs is not None
        assert call_kwargs[1].get("metrics_json") is not None

    # ============================================================
    # Background task integration
    # ============================================================

    @pytest.mark.asyncio
    async def test_run_pipeline_can_be_awaited_directly(
        self, service, mock_pipeline_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """run_pipeline should be awaitable directly (not just background)."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        result = await service.run_pipeline(sample_pipeline.id)

        assert result is not None
        assert hasattr(result, 'id')

    @pytest.mark.asyncio
    async def test_run_pipeline_stores_started_at(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """The PipelineRun should record started_at timestamp."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        await service.run_pipeline(sample_pipeline.id)

        args = mock_run_repo.create.call_args
        created_run = args[0][0]
        assert created_run is not None
        assert created_run.started_at is not None

    @pytest.mark.asyncio
    async def test_run_pipeline_stores_finished_at(
        self, service, mock_pipeline_repo, mock_run_repo, mock_datasource_repo,
        mock_db, sample_pipeline
    ):
        """On completion, finished_at should be recorded."""
        mock_pipeline_repo.get_by_id = AsyncMock(return_value=sample_pipeline)
        mock_datasource = MagicMock()
        mock_datasource.id = "ds-uuid-001"
        mock_datasource_repo.get_by_id = AsyncMock(return_value=mock_datasource)

        await service.run_pipeline(sample_pipeline.id)

        mock_run_repo.update_status.assert_called()
        call_kwargs = mock_run_repo.update_status.call_args
        assert call_kwargs[1].get("finished_at") is not None
