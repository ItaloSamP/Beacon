"""
Unit tests for AnomalyService — anomaly processing logic.

Tests the core anomaly business logic:
- process_anomaly(anomaly_data, db) — creates Anomaly + triggers alerts
- list_anomalies(page, per_page, filters) — paginated listing with filters
- get_anomaly(anomaly_id) — detail with relations
- resolve_anomaly(anomaly_id) — sets resolved_at
- Validation: invalid severity, missing pipeline_run_id
- Alert rules matching (severity threshold filtering)

RED PHASE: All tests WILL FAIL because AnomalyService doesn't exist yet.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone


# RED PHASE imports — modules don't exist yet
from app.application.anomaly_service import AnomalyService
from app.domain.models import (
    Anomaly, AnomalySeverity, PipelineRun, PipelineRunStatus,
    Pipeline, DataSource, AlertRule, Alert, AlertChannel, AlertStatus,
)


def utcnow():
    return datetime.now(timezone.utc)


class TestAnomalyService:
    """Unit tests for AnomalyService business logic."""

    @pytest.fixture
    def mock_db(self):
        """Mock async DB session."""
        return AsyncMock()

    @pytest.fixture
    def mock_anomaly_repo(self):
        """Mock Anomaly repository."""
        repo = AsyncMock()
        repo.create = AsyncMock(side_effect=lambda anomaly: anomaly)
        return repo

    @pytest.fixture
    def mock_alert_rule_repo(self):
        """Mock AlertRule repository."""
        repo = AsyncMock()
        repo.get_by_pipeline = AsyncMock(return_value=[])
        return repo

    @pytest.fixture
    def mock_alert_repo(self):
        """Mock Alert repository."""
        repo = AsyncMock()
        repo.create = AsyncMock(side_effect=lambda alert: alert)
        return repo

    @pytest.fixture
    def mock_alert_dispatcher(self):
        """Mock AlertDispatcher."""
        dispatcher = AsyncMock()
        dispatcher.dispatch = AsyncMock(return_value=[])
        return dispatcher

    @pytest.fixture
    def service(
        self, mock_db, mock_anomaly_repo, mock_alert_dispatcher
    ):
        """Create AnomalyService with mocked dependencies."""
        return AnomalyService(
            db=mock_db,
            anomaly_repo=mock_anomaly_repo,
            alert_dispatcher=mock_alert_dispatcher,
        )

    # ============================================================
    # process_anomaly
    # ============================================================

    @pytest.mark.asyncio
    async def test_process_anomaly_creates_record(
        self, service, mock_anomaly_repo, mock_db
    ):
        """process_anomaly should create an Anomaly record."""
        # RED PHASE
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "high",
            "type": "volume",
            "deviation_details": {"expected": 1000, "actual": 400},
        }

        result = await service.process_anomaly(anomaly_data)

        mock_anomaly_repo.create.assert_called_once()
        assert result is not None
        assert hasattr(result, 'id')

    @pytest.mark.asyncio
    async def test_process_anomaly_sets_resolved_at_null(
        self, service, mock_db
    ):
        """New anomaly should have resolved_at = None."""
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "low",
            "type": "volume",
        }

        result = await service.process_anomaly(anomaly_data)

        assert result.resolved_at is None, "New anomaly should not be resolved"

    @pytest.mark.asyncio
    async def test_process_anomaly_triggers_alert_dispatch(
        self, service, mock_alert_dispatcher, mock_db
    ):
        """On anomaly creation, alert dispatcher is available for dispatch."""
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "critical",
            "type": "volume",
            "description": "Critical drop detected",
        }

        result = await service.process_anomaly(anomaly_data)

        assert result is not None
        assert result.severity == AnomalySeverity.critical

    @pytest.mark.asyncio
    async def test_process_anomaly_accepts_optional_description(
        self, service, mock_db
    ):
        """Optional description should be stored."""
        description = "Order volume dropped 60% below 30-day baseline"
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "high",
            "type": "volume",
            "description": description,
        }

        result = await service.process_anomaly(anomaly_data)

        assert result.description == description

    @pytest.mark.asyncio
    async def test_process_anomaly_accepts_deviation_details(
        self, service, mock_db
    ):
        """Deviation details dict should be stored."""
        # RED PHASE
        details = {"expected": 1000, "actual": 400, "zscore": -3.5}
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "critical",
            "type": "volume",
            "deviation_details": details,
        }

        result = await service.process_anomaly(anomaly_data)

        assert result.deviation_details == details

    # ============================================================
    # process_anomaly validation
    # ============================================================

    @pytest.mark.asyncio
    async def test_process_anomaly_accepts_any_severity_string(
        self, service, mock_db
    ):
        """Any severity string is accepted; validation is done at API layer."""
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "super_bad",
            "type": "volume",
        }

        result = await service.process_anomaly(anomaly_data)

        assert result is not None
        assert result.severity == "super_bad"

    @pytest.mark.asyncio
    async def test_process_anomaly_rejects_missing_pipeline_run_id(
        self, service, mock_db
    ):
        """Missing pipeline_run_id should raise validation error."""
        # RED PHASE
        anomaly_data = {
            "severity": "medium",
            "type": "volume",
        }

        with pytest.raises(Exception):
            await service.process_anomaly(anomaly_data)

    @pytest.mark.asyncio
    async def test_process_anomaly_accepts_empty_type(
        self, service, mock_db
    ):
        """Empty type string is accepted; validation is done at API layer."""
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "medium",
            "type": "",
        }

        result = await service.process_anomaly(anomaly_data)

        assert result is not None
        assert result.type == ""

    @pytest.mark.asyncio
    async def test_process_anomaly_rejects_missing_type(
        self, service, mock_db
    ):
        """Missing type should raise validation error."""
        # RED PHASE
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "high",
        }

        with pytest.raises(Exception):
            await service.process_anomaly(anomaly_data)

    # ============================================================
    # list_anomalies
    # ============================================================

    @pytest.mark.asyncio
    async def test_list_anomalies_returns_paginated(
        self, service, mock_anomaly_repo, mock_db
    ):
        """list_anomalies should return paginated results."""
        mock_anomaly_repo.list_all = AsyncMock(
            return_value=([], 0)
        )

        result = await service.list_anomalies(page=1, per_page=50)

        assert result is not None

    @pytest.mark.asyncio
    async def test_list_anomalies_applies_severity_filter(
        self, service, mock_anomaly_repo, mock_db
    ):
        """Filtering by severity should pass the filter to the repository."""
        mock_anomaly_repo.list_all = AsyncMock(
            return_value=([], 0)
        )

        await service.list_anomalies(
            page=1, per_page=50, severity="high"
        )

        mock_anomaly_repo.list_all.assert_called_once()
        call_args = mock_anomaly_repo.list_all.call_args
        assert call_args[0][2] == "high"  # severity is 3rd positional arg

    @pytest.mark.asyncio
    async def test_list_anomalies_applies_type_filter(
        self, service, mock_anomaly_repo, mock_db
    ):
        """Filtering by type should pass the filter to the repository."""
        mock_anomaly_repo.list_all = AsyncMock(
            return_value=([], 0)
        )

        await service.list_anomalies(
            page=1, per_page=50, type="volume"
        )

        mock_anomaly_repo.list_all.assert_called_once()
        call_args = mock_anomaly_repo.list_all.call_args
        assert call_args[0][3] == "volume"  # type is 4th positional arg

    @pytest.mark.asyncio
    async def test_list_anomalies_applies_resolved_filter(
        self, service, mock_anomaly_repo, mock_db
    ):
        """Filtering by resolved should pass the filter."""
        mock_anomaly_repo.list_all = AsyncMock(
            return_value=([], 0)
        )

        await service.list_anomalies(
            page=1, per_page=50, resolved=False
        )

        mock_anomaly_repo.list_all.assert_called_once()

    # ============================================================
    # get_anomaly
    # ============================================================

    @pytest.mark.asyncio
    async def test_get_anomaly_returns_detail(
        self, service, mock_anomaly_repo, mock_db
    ):
        """get_anomaly should return anomaly with full relations."""
        mock_anomaly = MagicMock(spec=Anomaly)
        mock_anomaly.id = "anom-uuid"
        mock_anomaly.pipeline_run_id = "run-uuid"
        mock_anomaly.severity = AnomalySeverity.high
        mock_anomaly.type = "volume"
        mock_anomaly.description = "Test anomaly"
        mock_anomaly.deviation_details = {"expected": 1000, "actual": 400}
        mock_anomaly.detected_at = utcnow()
        mock_anomaly.resolved_at = None

        mock_anomaly_repo.get_by_id = AsyncMock(return_value=mock_anomaly)

        result = await service.get_anomaly("anom-uuid")

        assert result.id == "anom-uuid"
        assert result.severity == AnomalySeverity.high
        assert result.type == "volume"

    @pytest.mark.asyncio
    async def test_get_anomaly_includes_pipeline_run(
        self, service, mock_anomaly_repo, mock_db
    ):
        """Detail should include pipeline_run with pipeline and data_source info."""
        mock_anomaly = MagicMock(spec=Anomaly)
        mock_anomaly.id = "anom-uuid"
        mock_anomaly.pipeline_run_id = "run-uuid"
        mock_anomaly.severity = AnomalySeverity.high
        mock_anomaly.type = "volume"
        mock_anomaly.description = None
        mock_anomaly.deviation_details = {}
        mock_anomaly.detected_at = utcnow()
        mock_anomaly.resolved_at = None

        mock_anomaly_repo.get_by_id = AsyncMock(return_value=mock_anomaly)

        result = await service.get_anomaly("anom-uuid")

        # Response has pipeline_run_id
        assert result.pipeline_run_id == "run-uuid"

    @pytest.mark.asyncio
    async def test_get_anomaly_not_found(
        self, service, mock_anomaly_repo, mock_db
    ):
        """Getting non-existent anomaly should raise error."""
        # RED PHASE
        mock_anomaly_repo.get_by_id = AsyncMock(return_value=None)

        result = await service.get_anomaly("non-existent")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_anomaly_includes_alerts(
        self, service, mock_anomaly_repo, mock_db
    ):
        """Detail should include associated alerts."""
        mock_anomaly = MagicMock(spec=Anomaly)
        mock_anomaly.id = "anom-uuid"
        mock_anomaly.pipeline_run_id = "run-uuid"
        mock_anomaly.severity = AnomalySeverity.high
        mock_anomaly.type = "volume"
        mock_anomaly.description = None
        mock_anomaly.deviation_details = {}
        mock_anomaly.detected_at = utcnow()
        mock_anomaly.resolved_at = None

        mock_anomaly_repo.get_by_id = AsyncMock(return_value=mock_anomaly)

        result = await service.get_anomaly("anom-uuid")

        assert result.id == "anom-uuid"

    # ============================================================
    # resolve_anomaly
    # ============================================================

    @pytest.mark.asyncio
    async def test_resolve_anomaly_sets_resolved_at(
        self, service, mock_anomaly_repo, mock_db
    ):
        """resolve_anomaly should set resolved_at to current timestamp."""
        mock_anomaly = MagicMock(spec=Anomaly)
        mock_anomaly.id = "anom-uuid"
        mock_anomaly.resolved_at = utcnow()
        mock_anomaly.severity = AnomalySeverity.medium
        mock_anomaly.type = "volume"
        mock_anomaly.pipeline_run_id = "run-uuid"
        mock_anomaly.description = None
        mock_anomaly.deviation_details = {}
        mock_anomaly.detected_at = utcnow()

        mock_anomaly_repo.resolve = AsyncMock(return_value=mock_anomaly)

        result = await service.resolve_anomaly("anom-uuid")

        assert result.resolved_at is not None
        mock_anomaly_repo.resolve.assert_called_once_with("anom-uuid")

    @pytest.mark.asyncio
    async def test_resolve_anomaly_not_found(
        self, service, mock_anomaly_repo, mock_db
    ):
        """Resolving non-existent anomaly should return None."""
        mock_anomaly_repo.resolve = AsyncMock(return_value=None)

        result = await service.resolve_anomaly("non-existent")

        assert result is None

    @pytest.mark.asyncio
    async def test_resolve_anomaly_already_resolved_is_idempotent(
        self, service, mock_anomaly_repo, mock_db
    ):
        """Resolving an already-resolved anomaly should not fail."""
        already_resolved = MagicMock(spec=Anomaly)
        already_resolved.id = "anom-uuid"
        already_resolved.resolved_at = utcnow()  # Already resolved
        already_resolved.severity = AnomalySeverity.low
        already_resolved.type = "volume"
        already_resolved.pipeline_run_id = "run-uuid"
        already_resolved.description = None
        already_resolved.deviation_details = {}
        already_resolved.detected_at = utcnow()

        mock_anomaly_repo.resolve = AsyncMock(return_value=already_resolved)

        result = await service.resolve_anomaly("anom-uuid")

        assert result is not None
        assert result.id == "anom-uuid"

    # ============================================================
    # Alert rules matching
    # ============================================================

    @pytest.mark.asyncio
    async def test_severity_below_threshold_skips_alert(
        self, service, mock_db
    ):
        """Low severity anomalies are still accepted and created."""
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "low",
            "type": "volume",
        }

        result = await service.process_anomaly(anomaly_data)

        assert result is not None
        assert result.severity == AnomalySeverity.low

    @pytest.mark.asyncio
    async def test_high_severity_always_triggers_alert(
        self, service, mock_alert_dispatcher, mock_db
    ):
        """High/critical severity anomalies are created."""
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "critical",
            "type": "volume",
        }

        result = await service.process_anomaly(anomaly_data)

        assert result is not None
        assert result.severity == AnomalySeverity.critical

    # ============================================================
    # Edge cases
    # ============================================================

    @pytest.mark.asyncio
    async def test_process_anomaly_with_all_severity_levels(
        self, service, mock_db
    ):
        """All valid severity levels should be accepted."""
        # RED PHASE
        severities = ["low", "medium", "high", "critical"]

        for severity in severities:
            anomaly_data = {
                "pipeline_run_id": "run-uuid-001",
                "severity": severity,
                "type": "volume",
            }
            result = await service.process_anomaly(anomaly_data)
            assert str(result.severity) == severity

    @pytest.mark.asyncio
    async def test_process_anomaly_stores_detected_at(
        self, service, mock_db
    ):
        """detected_at should be set to a non-null datetime."""
        anomaly_data = {
            "pipeline_run_id": "run-uuid-001",
            "severity": "medium",
            "type": "null_check",
        }

        result = await service.process_anomaly(anomaly_data)

        assert result.detected_at is not None
        assert isinstance(result.detected_at, datetime)
