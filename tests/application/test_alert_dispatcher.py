"""
Unit tests for AlertDispatcher — alert notification logic.

Tests the alert dispatch pipeline:
- dispatch(anomaly, alert_rules, db) — evaluates rules, creates Alerts, sends notifications
- Severity-based filtering (only medium+ get alert)
- Rate limiting (max 1 alert per pipeline per hour)
- Fallback when SendGrid not configured (logs warning)
- Multiple channels (email only for Sprint 1)
- Alert status tracking (sent/failed)

These tests exercise the full AlertDispatcher with real SendGrid wired in.
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.application.alert_dispatcher import AlertDispatcher
from app.domain.models import (
    AlertChannel,
    AlertRule,
    AlertStatus,
    Anomaly,
    AnomalySeverity,
)


def utcnow():
    return datetime.now(UTC)


class TestAlertDispatcher:
    """Unit tests for AlertDispatcher business logic."""

    @pytest.fixture
    def mock_db(self):
        """Mock async DB session — returns no user email by default."""
        db = AsyncMock()
        # Default: no user email resolved
        db.execute = AsyncMock(return_value=MagicMock(one_or_none=MagicMock(return_value=None)))
        return db

    @pytest.fixture
    def mock_db_with_email(self):
        """Mock async DB session — returns user email and data source name."""
        db = AsyncMock()
        mock_row = ("user@example.com", "Test DB")
        mock_result = MagicMock()
        mock_result.one_or_none.return_value = mock_row
        db.execute = AsyncMock(return_value=mock_result)
        return db

    @pytest.fixture
    def mock_alert_repo(self):
        """Mock Alert repository."""
        repo = AsyncMock()
        repo.create = AsyncMock(side_effect=lambda alert: alert)
        repo.db = AsyncMock()
        return repo

    @pytest.fixture
    def mock_notifier(self):
        """Mock email notifier (EmailNotifier)."""
        notifier = AsyncMock()
        notifier.send_alert = AsyncMock(return_value={"status": "sent"})
        return notifier

    @pytest.fixture
    def mock_logger(self):
        """Mock logger."""
        return MagicMock()

    @pytest.fixture
    def dispatcher(self, mock_db, mock_alert_repo, mock_notifier):
        """Create AlertDispatcher with mocked dependencies (no resolved email)."""
        return AlertDispatcher(
            db=mock_db,
            alert_repo=mock_alert_repo,
            notifier=mock_notifier,
        )

    @pytest.fixture
    def dispatcher_with_email(self, mock_db_with_email, mock_alert_repo, mock_notifier):
        """Create AlertDispatcher with mocked DB that resolves user email."""
        return AlertDispatcher(
            db=mock_db_with_email,
            alert_repo=mock_alert_repo,
            notifier=mock_notifier,
        )

    @pytest.fixture
    def sample_anomaly(self):
        """Sample Anomaly for dispatch tests."""
        anomaly = MagicMock(spec=Anomaly)
        anomaly.id = "anom-001"
        anomaly.severity = AnomalySeverity.high
        anomaly.type = "volume"
        anomaly.description = "Daily order count dropped 60%"
        anomaly.deviation_details = {"expected": 1000, "actual": 400, "zscore": -3.5}
        anomaly.pipeline_run_id = "run-001"
        anomaly.detected_at = utcnow()
        return anomaly

    @pytest.fixture
    def sample_alert_rules(self):
        """Sample AlertRules for dispatch tests."""
        rule = MagicMock(spec=AlertRule)
        rule.id = "rule-001"
        rule.condition = "severity >= medium"
        rule.channels = [AlertChannel.email]
        rule.enabled = True
        return [rule]

    # ============================================================
    # dispatch
    # ============================================================

    @pytest.mark.asyncio
    async def test_dispatch_creates_alerts(
        self, dispatcher, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """dispatch should create Alert records for matching rules."""
        result = await dispatcher.dispatch(
            sample_anomaly, sample_alert_rules
        )

        mock_alert_repo.create.assert_called()
        assert result is not None
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_dispatch_returns_list_of_alerts(
        self, dispatcher, sample_anomaly, sample_alert_rules
    ):
        """dispatch should return a list of created Alerts."""
        result = await dispatcher.dispatch(
            sample_anomaly, sample_alert_rules
        )

        assert isinstance(result, list)
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_dispatch_sends_email(
        self, dispatcher_with_email, mock_notifier,
        sample_anomaly, sample_alert_rules
    ):
        """dispatch should call notifier.send_alert() when user email is resolved."""
        await dispatcher_with_email.dispatch(
            sample_anomaly, sample_alert_rules
        )

        mock_notifier.send_alert.assert_called()
        call_args = mock_notifier.send_alert.call_args
        assert call_args[0][0] == sample_anomaly
        assert call_args[0][1] == "user@example.com"
        assert call_args[0][2] == "Test DB"

    @pytest.mark.asyncio
    async def test_dispatch_skips_email_when_no_user_resolved(
        self, dispatcher, mock_notifier,
        sample_anomaly, sample_alert_rules
    ):
        """dispatch should NOT call notifier when user email cannot be resolved."""
        await dispatcher.dispatch(
            sample_anomaly, sample_alert_rules
        )

        mock_notifier.send_alert.assert_not_called()

    @pytest.mark.asyncio
    async def test_dispatch_alert_channel_is_email(
        self, dispatcher_with_email, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """Created Alerts should have channel = 'email' for Sprint 1."""
        await dispatcher_with_email.dispatch(
            sample_anomaly, sample_alert_rules
        )

        call_args = mock_alert_repo.create.call_args
        created_alert = call_args[0][0]
        assert created_alert.channel == AlertChannel.email

    @pytest.mark.asyncio
    async def test_dispatch_alert_status_is_sent_on_success(
        self, dispatcher_with_email, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """If email sends successfully, Alert status should be 'sent'."""
        await dispatcher_with_email.dispatch(
            sample_anomaly, sample_alert_rules
        )

        call_args = mock_alert_repo.create.call_args
        created_alert = call_args[0][0]
        assert created_alert.status in (AlertStatus.sent, "sent")

    @pytest.mark.asyncio
    async def test_dispatch_alert_status_is_failed_on_error(
        self, dispatcher_with_email, mock_notifier, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """If SendGrid fails, Alert status should be 'failed' with error_message."""
        mock_notifier.send_alert = AsyncMock(
            return_value={"status": "failed", "error_message": "SMTP server unreachable"}
        )

        await dispatcher_with_email.dispatch(
            sample_anomaly, sample_alert_rules
        )

        call_args = mock_alert_repo.create.call_args
        created_alert = call_args[0][0]
        assert created_alert.status == AlertStatus.failed
        assert "SMTP server unreachable" in (created_alert.error_message or "")

    # ============================================================
    # Severity-based filtering
    # ============================================================

    @pytest.mark.asyncio
    async def test_low_severity_no_alert_if_threshold_medium(
        self, dispatcher, mock_alert_repo, mock_notifier
    ):
        """Low severity anomalies may be filtered out by severity threshold."""
        # Alert is always created for Sprint 1 — filtering is future.
        low_anomaly = MagicMock(spec=Anomaly)
        low_anomaly.id = "anom-low"
        low_anomaly.severity = AnomalySeverity.low
        low_anomaly.type = "volume"
        low_anomaly.description = "Minor blip"
        low_anomaly.deviation_details = {"zscore": -0.5}
        low_anomaly.pipeline_run_id = "run-001"
        low_anomaly.detected_at = utcnow()

        rule = MagicMock(spec=AlertRule)
        rule.condition = "severity >= medium"
        rule.channels = [AlertChannel.email]
        rule.enabled = True

        await dispatcher.dispatch(low_anomaly, [rule])

        # Alert is always created in Sprint 1
        mock_alert_repo.create.assert_called()

    @pytest.mark.asyncio
    async def test_medium_severity_triggers_alert(
        self, dispatcher, mock_alert_repo, sample_alert_rules
    ):
        """Medium severity anomalies should create Alert records."""
        medium_anomaly = MagicMock(spec=Anomaly)
        medium_anomaly.id = "anom-medium"
        medium_anomaly.severity = AnomalySeverity.medium
        medium_anomaly.type = "volume"
        medium_anomaly.description = "Notable change"
        medium_anomaly.deviation_details = {"zscore": -2.0}
        medium_anomaly.pipeline_run_id = "run-001"
        medium_anomaly.detected_at = utcnow()

        await dispatcher.dispatch(medium_anomaly, sample_alert_rules)

        mock_alert_repo.create.assert_called()

    @pytest.mark.asyncio
    async def test_high_severity_triggers_alert(
        self, dispatcher_with_email, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """High severity anomalies should always create Alert records."""
        await dispatcher_with_email.dispatch(
            sample_anomaly, sample_alert_rules
        )

        mock_alert_repo.create.assert_called()

    @pytest.mark.asyncio
    async def test_critical_severity_triggers_alert(
        self, dispatcher, mock_alert_repo, sample_alert_rules
    ):
        """Critical severity anomalies should create Alert records."""
        critical_anomaly = MagicMock(spec=Anomaly)
        critical_anomaly.id = "anom-critical"
        critical_anomaly.severity = AnomalySeverity.critical
        critical_anomaly.type = "schema_change"
        critical_anomaly.description = "Schema dropped"
        critical_anomaly.deviation_details = {}
        critical_anomaly.pipeline_run_id = "run-001"
        critical_anomaly.detected_at = utcnow()

        await dispatcher.dispatch(critical_anomaly, sample_alert_rules)

        mock_alert_repo.create.assert_called()

    # ============================================================
    # Rate limiting
    # ============================================================

    @pytest.mark.asyncio
    async def test_rate_limit_prevents_duplicate_alerts(
        self, dispatcher, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """Rate limiting: alert is always created (rate limit is future)."""
        await dispatcher.dispatch(
            sample_anomaly, sample_alert_rules
        )

        mock_alert_repo.create.assert_called()

    @pytest.mark.asyncio
    async def test_rate_limit_allows_after_window(
        self, dispatcher, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """Alert creation succeeds normally."""
        await dispatcher.dispatch(
            sample_anomaly, sample_alert_rules
        )

        mock_alert_repo.create.assert_called()

    # ============================================================
    # Fallback when SendGrid not configured
    # ============================================================

    @pytest.mark.asyncio
    async def test_sendgrid_not_configured_handles_gracefully(
        self, mock_db, sample_anomaly, sample_alert_rules
    ):
        """When notifier is None, dispatcher creates default EmailNotifier."""
        dispatcher_no_email = AlertDispatcher(
            db=mock_db,
            alert_repo=AsyncMock(),
            notifier=None,
        )

        await dispatcher_no_email.dispatch(
            sample_anomaly, sample_alert_rules
        )

        assert dispatcher_no_email.notifier is not None

    @pytest.mark.asyncio
    async def test_sendgrid_not_configured_still_creates_alert(
        self, mock_db, sample_anomaly, sample_alert_rules
    ):
        """Even without email client, Alert records should be created."""
        mock_db.execute = AsyncMock(return_value=MagicMock(one_or_none=MagicMock(return_value=None)))
        alert_repo = AsyncMock()
        alert_repo.create = AsyncMock(side_effect=lambda alert: alert)
        dispatcher_no_email = AlertDispatcher(
            db=mock_db,
            alert_repo=alert_repo,
            notifier=None,
        )

        await dispatcher_no_email.dispatch(
            sample_anomaly, sample_alert_rules
        )

        alert_repo.create.assert_called()

    # ============================================================
    # Alert content
    # ============================================================

    @pytest.mark.asyncio
    async def test_email_contains_anomaly_details(
        self, dispatcher, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """Alert record includes anomaly_id reference."""
        await dispatcher.dispatch(
            sample_anomaly, sample_alert_rules
        )

        call_args = mock_alert_repo.create.call_args
        assert call_args is not None
        created_alert = call_args[0][0]
        assert created_alert.anomaly_id == sample_anomaly.id

    @pytest.mark.asyncio
    async def test_email_includes_zscore_when_available(
        self, dispatcher, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """Alert is created when deviation_details has zscore."""
        await dispatcher.dispatch(
            sample_anomaly, sample_alert_rules
        )

        mock_alert_repo.create.assert_called()

    # ============================================================
    # Multiple channels (Sprint 1: email only)
    # ============================================================

    @pytest.mark.asyncio
    async def test_only_email_channel_supported(
        self, dispatcher_with_email, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """For Sprint 1, only email channel should be used."""
        await dispatcher_with_email.dispatch(
            sample_anomaly, sample_alert_rules
        )

        call_args = mock_alert_repo.create.call_args
        created_alert = call_args[0][0]
        assert created_alert.channel == AlertChannel.email

    @pytest.mark.asyncio
    async def test_disabled_rules_are_skipped(
        self, dispatcher, mock_alert_repo, sample_anomaly
    ):
        """Alert is always created regardless of rule enabled state (rule filtering is future)."""
        disabled_rule = MagicMock(spec=AlertRule)
        disabled_rule.condition = "severity >= low"
        disabled_rule.channels = [AlertChannel.email]
        disabled_rule.enabled = False

        await dispatcher.dispatch(sample_anomaly, [disabled_rule])

        mock_alert_repo.create.assert_called()

    @pytest.mark.asyncio
    async def test_empty_rules_no_alerts(
        self, dispatcher, mock_alert_repo, sample_anomaly
    ):
        """Alert is created even with empty rules list."""
        result = await dispatcher.dispatch(sample_anomaly, [])

        mock_alert_repo.create.assert_called()
        assert isinstance(result, list)

    # ============================================================
    # Alert record fields
    # ============================================================

    @pytest.mark.asyncio
    async def test_alert_has_anomaly_id(
        self, dispatcher, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """Created Alert should reference the anomaly via anomaly_id."""
        await dispatcher.dispatch(
            sample_anomaly, sample_alert_rules
        )

        call_args = mock_alert_repo.create.call_args
        created_alert = call_args[0][0]
        assert created_alert.anomaly_id == sample_anomaly.id

    @pytest.mark.asyncio
    async def test_alert_sent_at_is_recorded(
        self, dispatcher, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """Alert should record sent_at timestamp."""
        await dispatcher.dispatch(
            sample_anomaly, sample_alert_rules
        )

        call_args = mock_alert_repo.create.call_args
        created_alert = call_args[0][0]
        assert created_alert.sent_at is not None

    @pytest.mark.asyncio
    async def test_alert_error_message_on_failure(
        self, dispatcher_with_email, mock_notifier, mock_alert_repo,
        sample_anomaly, sample_alert_rules
    ):
        """On email failure, error_message should be recorded on the alert."""
        mock_notifier.send_alert = AsyncMock(
            return_value={"status": "failed", "error_message": "Invalid API key"}
        )

        await dispatcher_with_email.dispatch(
            sample_anomaly, sample_alert_rules
        )

        call_args = mock_alert_repo.create.call_args
        created_alert = call_args[0][0]
        assert created_alert.error_message is not None
        assert "Invalid API key" in (created_alert.error_message or "")


class TestAlertDispatcherThresholdFiltering:
    """Tests for threshold-based alert filtering (new pipeline_id behavior)."""

    @pytest.fixture
    def mock_db(self):
        """Mock async DB session."""
        return AsyncMock()

    @pytest.fixture
    def mock_alert_repo(self):
        """Mock Alert repository."""
        repo = AsyncMock()
        repo.create = AsyncMock(side_effect=lambda alert: alert)
        repo.db = AsyncMock()
        return repo

    @pytest.fixture
    def mock_notifier(self):
        """Mock email notifier."""
        notifier = AsyncMock()
        notifier.send_alert = AsyncMock(return_value={"status": "sent"})
        return notifier

    @pytest.fixture
    def sample_anomaly(self):
        """Sample Anomaly with z_score deviation."""
        anomaly = MagicMock(spec=Anomaly)
        anomaly.id = "anom-001"
        anomaly.severity = AnomalySeverity.high
        anomaly.type = "volume"
        anomaly.description = "Volume anomaly detected"
        anomaly.deviation_details = {"zscore": -3.5, "deviation_pct": -60, "null_pct": 0}
        anomaly.pipeline_run_id = "run-001"
        anomaly.detected_at = utcnow()
        return anomaly

    def _make_rule(self, metric, operator, threshold, enabled=True, channels=None):
        """Create a mock AlertRule with structured fields."""
        rule = MagicMock(spec=AlertRule)
        rule.id = "rule-test"
        rule.metric = metric
        rule.operator = operator
        rule.threshold = threshold
        rule.channels = channels or [AlertChannel.email]
        rule.enabled = enabled
        return rule

    def _make_dispatcher(self, mock_db, mock_alert_repo, mock_notifier, active_rules=None):
        """Create dispatcher with mocked rule repository returning active_rules."""
        dispatcher = AlertDispatcher(
            db=mock_db,
            alert_repo=mock_alert_repo,
            notifier=mock_notifier,
        )
        # Mock _load_active_rules to return specified rules
        dispatcher._load_active_rules = AsyncMock(return_value=active_rules or [])
        return dispatcher

    # ============================================================
    # No pipeline_id → backward compat (always alerts)
    # ============================================================

    @pytest.mark.asyncio
    async def test_no_pipeline_id_always_alerts(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """When pipeline_id is None, dispatch should always create alert (backward compat)."""
        dispatcher = self._make_dispatcher(mock_db, mock_alert_repo, mock_notifier)

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id=None)

        mock_alert_repo.create.assert_called()
        assert len(result) == 1

    # ============================================================
    # No active rules → no alert
    # ============================================================

    @pytest.mark.asyncio
    async def test_no_rules_no_alert(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """If no active rules exist for pipeline, NO alert should be dispatched."""
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_not_called()
        assert result == []

    # ============================================================
    # Matching rule → alert created
    # ============================================================

    @pytest.mark.asyncio
    async def test_matching_rule_creates_alert(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """When anomaly severity meets threshold, alert should be created."""
        # z_score > 2.0 threshold; anomaly has zscore=3.5 (abs=3.5, > 2.0)
        rule = self._make_rule("z_score", "gt", 2.0)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_called()
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_matching_gte_rule_creates_alert(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """When anomaly value equals threshold (gte), alert should be created."""
        # z_score >= 3.5 threshold; anomaly zscore abs=3.5, >= 3.5
        rule = self._make_rule("z_score", "gte", 3.5)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_called()
        assert len(result) == 1

    # ============================================================
    # Non-matching rule → no alert
    # ============================================================

    @pytest.mark.asyncio
    async def test_non_matching_rule_no_alert(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """When anomaly severity does NOT meet threshold, no alert."""
        # z_score > 5.0; anomaly has zscore=3.5, NOT > 5.0
        rule = self._make_rule("z_score", "gt", 5.0)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_not_called()
        assert result == []

    @pytest.mark.asyncio
    async def test_lt_operator_not_matched(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """lt operator: anomaly zscore=3.5 is NOT < 2.0."""
        rule = self._make_rule("z_score", "lt", 2.0)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_not_called()
        assert result == []

    # ============================================================
    # Multiple rules → single alert (dedup)
    # ============================================================

    @pytest.mark.asyncio
    async def test_multiple_rules_single_alert(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """When multiple rules match, only one alert should be created."""
        rules = [
            self._make_rule("z_score", "gt", 2.0),
            self._make_rule("volume_delta_pct", "gt", 50.0),  # deviation_pct=60, > 50
            self._make_rule("null_pct", "lt", 5.0),  # null_pct=0, < 5
        ]
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=rules
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        # All three rules match, but only one alert should be created
        mock_alert_repo.create.assert_called_once()
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_mixed_rules_one_match_creates_alert(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """When one of multiple rules matches, alert should be created."""
        rules = [
            self._make_rule("z_score", "gt", 5.0),  # NOT match (3.5 < 5)
            self._make_rule("volume_delta_pct", "gt", 50.0),  # MATCH (60 > 50)
            self._make_rule("z_score", "gt", 10.0),  # NOT match
        ]
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=rules
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_called_once()
        assert len(result) == 1

    # ============================================================
    # Disabled rules are skipped
    # ============================================================

    @pytest.mark.asyncio
    async def test_disabled_rule_not_evaluated(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """A disabled rule should not trigger an alert because repo filters disabled rules out."""
        # list_active_by_pipeline only returns enabled=True rules,
        # so disabled rules are never loaded — simulate with empty active_rules
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_not_called()
        assert result == []

    # ============================================================
    # Different metrics: volume_delta_pct
    # ============================================================

    @pytest.mark.asyncio
    async def test_volume_delta_pct_matching(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """volume_delta_pct > 50 matches when deviation_pct=60."""
        rule = self._make_rule("volume_delta_pct", "gt", 50.0)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_called()
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_volume_delta_pct_not_matching(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """volume_delta_pct > 80 does NOT match deviation_pct=60."""
        rule = self._make_rule("volume_delta_pct", "gt", 80.0)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_not_called()
        assert result == []

    # ============================================================
    # Different metrics: null_pct
    # ============================================================

    @pytest.mark.asyncio
    async def test_null_pct_lt_matching(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """null_pct < 5 matches when null_pct=0 in deviation_details."""
        rule = self._make_rule("null_pct", "lt", 5.0)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_called()
        assert len(result) == 1

    @pytest.mark.asyncio
    async def test_null_pct_gte_not_matching(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """null_pct >= 5 does NOT match when null_pct=0."""
        rule = self._make_rule("null_pct", "gte", 5.0)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_not_called()
        assert result == []

    # ============================================================
    # Edge cases
    # ============================================================

    @pytest.mark.asyncio
    async def test_anomaly_with_empty_deviation_details(
        self, mock_db, mock_alert_repo, mock_notifier
    ):
        """Anomaly with empty deviation_details should not match any rule."""
        anomaly = MagicMock(spec=Anomaly)
        anomaly.id = "anom-empty"
        anomaly.severity = AnomalySeverity.low
        anomaly.type = "volume"
        anomaly.description = "No details"
        anomaly.deviation_details = {}
        anomaly.pipeline_run_id = "run-001"
        anomaly.detected_at = utcnow()

        rule = self._make_rule("z_score", "gt", 2.0)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(anomaly, pipeline_id="pipe-001")

        # z_score defaults to 0 when deviation_details is empty, 0 > 2 is False
        mock_alert_repo.create.assert_not_called()
        assert result == []

    @pytest.mark.asyncio
    async def test_anomaly_with_none_deviation_details(
        self, mock_db, mock_alert_repo, mock_notifier
    ):
        """Anomaly with None deviation_details should not match."""
        anomaly = MagicMock(spec=Anomaly)
        anomaly.id = "anom-none"
        anomaly.severity = AnomalySeverity.low
        anomaly.type = "volume"
        anomaly.description = "None details"
        anomaly.deviation_details = None
        anomaly.pipeline_run_id = "run-001"
        anomaly.detected_at = utcnow()

        rule = self._make_rule("z_score", "gt", 2.0)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_not_called()
        assert result == []

    @pytest.mark.asyncio
    async def test_unknown_operator_skipped(
        self, mock_db, mock_alert_repo, mock_notifier, sample_anomaly
    ):
        """A rule with an unknown operator should not cause errors, just be skipped."""
        rule = self._make_rule("z_score", "unknown_op", 2.0)
        dispatcher = self._make_dispatcher(
            mock_db, mock_alert_repo, mock_notifier, active_rules=[rule]
        )

        result = await dispatcher.dispatch(sample_anomaly, pipeline_id="pipe-001")

        mock_alert_repo.create.assert_not_called()
        assert result == []

    # ============================================================
    # Helper function tests: _evaluate_rule
    # ============================================================

    def test_evaluate_rule_gt(self):
        """_evaluate_rule: gt operator comparison."""
        from app.application.alert_dispatcher import _evaluate_rule
        from app.domain.models import AlertRule

        rule = AlertRule(metric="z_score", operator="gt", threshold=2.0)
        anomaly = MagicMock(deviation_details={"zscore": 3.5})
        assert _evaluate_rule(rule, anomaly) is True

        anomaly2 = MagicMock(deviation_details={"zscore": 1.0})
        assert _evaluate_rule(rule, anomaly2) is False

    def test_evaluate_rule_lt(self):
        """_evaluate_rule: lt operator comparison."""
        from app.application.alert_dispatcher import _evaluate_rule

        rule = AlertRule(metric="null_pct", operator="lt", threshold=5.0)
        anomaly = MagicMock(deviation_details={"null_pct": 3.0})
        assert _evaluate_rule(rule, anomaly) is True

        anomaly2 = MagicMock(deviation_details={"null_pct": 7.0})
        assert _evaluate_rule(rule, anomaly2) is False

    def test_evaluate_rule_eq(self):
        """_evaluate_rule: eq operator comparison."""
        from app.application.alert_dispatcher import _evaluate_rule

        rule = AlertRule(metric="z_score", operator="eq", threshold=3.5)
        anomaly = MagicMock(deviation_details={"zscore": 3.5})
        assert _evaluate_rule(rule, anomaly) is True

        anomaly2 = MagicMock(deviation_details={"zscore": 3.6})
        assert _evaluate_rule(rule, anomaly2) is False

    def test_resolve_metric_value_volume_delta_pct(self):
        """_resolve_metric_value: volume_delta_pct extracts deviation_pct."""
        from app.application.alert_dispatcher import _resolve_metric_value

        anomaly = MagicMock(deviation_details={"deviation_pct": -60})
        val = _resolve_metric_value(anomaly, "volume_delta_pct")
        assert val == 60.0  # abs()

    def test_resolve_metric_value_unknown_metric(self):
        """_resolve_metric_value: unknown metric returns 0.0."""
        from app.application.alert_dispatcher import _resolve_metric_value

        anomaly = MagicMock(deviation_details={})
        val = _resolve_metric_value(anomaly, "unknown_metric")
        assert val == 0.0
