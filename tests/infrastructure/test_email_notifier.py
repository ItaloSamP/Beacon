"""
Unit tests for EmailNotifier — SendGrid email delivery.

Tests the complete email notification flow:
- Graceful degradation when SENDGRID_API_KEY is missing
- Error handling when SendGrid API fails
- Correct HTML email body construction
- Correct email subject construction
"""

import asyncio
from unittest.mock import MagicMock, patch

import pytest

from app.domain.models import AnomalySeverity
from app.infrastructure.notifiers.email import (
    EmailNotifier,
    _build_html_body,
    _build_subject,
    _recommendation,
    _severity_badge,
)


class TestEmailNotifierSendAlert:
    """Tests for EmailNotifier.send_alert() method."""

    @pytest.fixture
    def sample_anomaly(self):
        """Sample anomaly for email tests."""
        anomaly = MagicMock()
        anomaly.id = "anom-001"
        anomaly.severity = AnomalySeverity.high
        anomaly.type = "volume"
        anomaly.description = "Daily order count dropped 60%"
        anomaly.deviation_details = {
            "expected": 1000,
            "actual": 400,
            "zscore": -3.5,
        }
        anomaly.pipeline_run_id = "run-001"
        return anomaly

    @pytest.mark.asyncio
    async def test_send_alert_returns_sent_when_no_api_key(self, sample_anomaly):
        """When SENDGRID_API_KEY is empty, return {'status': 'sent'} without calling API."""
        notifier = EmailNotifier(api_key="", from_email="from@test.com")
        result = await notifier.send_alert(
            sample_anomaly, "to@test.com", "TestDB"
        )
        assert result == {"status": "sent"}

    @pytest.mark.asyncio
    async def test_send_alert_calls_sendgrid_with_correct_params(self, sample_anomaly):
        """send_alert should call SendGrid SDK with correct to, from, subject, and HTML body."""
        mock_sg = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 202
        mock_sg.send = MagicMock(return_value=mock_response)

        with patch(
            "app.infrastructure.notifiers.email.SendGridAPIClient",
            return_value=mock_sg,
        ):
            notifier = EmailNotifier(
                api_key="SG.fake-key", from_email="alerts@beacon.app"
            )
            result = await notifier.send_alert(
                sample_anomaly, "user@example.com", "Production DB"
            )

        assert result == {"status": "sent"}
        mock_sg.send.assert_called_once()

        # Check the Mail object passed to send()
        mail_arg = mock_sg.send.call_args[0][0]
        mail_dict = mail_arg.get()
        personalizations = mail_dict.get("personalizations", [{}])[0]

        assert personalizations.get("to", [{}])[0].get("email") == "user@example.com"
        assert mail_dict.get("from", {}).get("email") == "alerts@beacon.app"

    @pytest.mark.asyncio
    async def test_send_alert_returns_failed_on_sendgrid_error(self, sample_anomaly):
        """When SendGrid raises an exception, return {'status': 'failed', 'error_message': ...}."""
        mock_sg = MagicMock()
        mock_sg.send = MagicMock(side_effect=Exception("Network error"))

        with patch(
            "app.infrastructure.notifiers.email.SendGridAPIClient",
            return_value=mock_sg,
        ):
            notifier = EmailNotifier(
                api_key="SG.fake-key", from_email="alerts@beacon.app"
            )
            result = await notifier.send_alert(
                sample_anomaly, "user@example.com", "TestDB"
            )

        assert result["status"] == "failed"
        assert "Network error" in result["error_message"]

    @pytest.mark.asyncio
    async def test_send_alert_uses_async_to_thread(self, sample_anomaly):
        """send_alert should wrap the sync SendGrid call in asyncio.to_thread."""
        mock_sg = MagicMock()
        mock_sg.send = MagicMock(return_value=MagicMock(status_code=202))

        with patch(
            "app.infrastructure.notifiers.email.SendGridAPIClient",
            return_value=mock_sg,
        ), patch(
            "app.infrastructure.notifiers.email.asyncio.to_thread",
            wraps=asyncio.to_thread,
        ) as mock_to_thread:
            notifier = EmailNotifier(
                api_key="SG.fake-key", from_email="alerts@beacon.app"
            )
            await notifier.send_alert(
                sample_anomaly, "user@example.com", "TestDB"
            )

        mock_to_thread.assert_called_once()


class TestEmailTemplate:
    """Tests for email HTML template and subject builders."""

    @pytest.fixture
    def sample_anomaly(self):
        anomaly = MagicMock()
        anomaly.id = "anom-002"
        anomaly.severity = AnomalySeverity.critical
        anomaly.type = "null_check"
        anomaly.description = "Null rate jumped to 45%"
        anomaly.deviation_details = {
            "expected": 0.02,
            "actual": 0.45,
            "zscore": 8.2,
        }
        return anomaly

    def test_build_html_contains_anomaly_type(self, sample_anomaly):
        """HTML body should contain the anomaly type."""
        body = _build_html_body(sample_anomaly, "My DB")
        assert "null_check" in body.lower()

    def test_build_html_contains_severity(self, sample_anomaly):
        """HTML body should contain the severity."""
        body = _build_html_body(sample_anomaly, "My DB")
        assert "critical" in body.lower()

    def test_build_html_contains_data_source_name(self, sample_anomaly):
        """HTML body should contain the data source name."""
        body = _build_html_body(sample_anomaly, "My DB")
        assert "My DB" in body

    def test_build_html_contains_zscore(self, sample_anomaly):
        """HTML body should contain the z-score value."""
        body = _build_html_body(sample_anomaly, "My DB")
        assert "8.20" in body

    def test_build_html_contains_comparison_values(self, sample_anomaly):
        """HTML body should have expected vs actual comparison."""
        body = _build_html_body(sample_anomaly, "My DB")
        assert "0.02" in body
        assert "0.45" in body

    def test_build_html_contains_recommendation(self, sample_anomaly):
        """HTML body should contain a recommendation based on anomaly type."""
        body = _build_html_body(sample_anomaly, "My DB")
        assert "null" in body.lower() or "source" in body.lower()

    def test_build_html_has_valid_structure(self, sample_anomaly):
        """HTML body should be a valid HTML document."""
        body = _build_html_body(sample_anomaly, "My DB")
        assert "<!DOCTYPE html>" in body
        assert "<html" in body
        assert "</html>" in body

    def test_build_subject_contains_type_and_source(self, sample_anomaly):
        """Subject should contain anomaly type and data source name."""
        subject = _build_subject(sample_anomaly, "My DB")
        assert "null_check" in subject
        assert "My DB" in subject
        assert "Beacon Alert" in subject

    def test_build_subject_contains_severity(self, sample_anomaly):
        """Subject should contain severity level."""
        subject = _build_subject(sample_anomaly, "My DB")
        assert "CRITICAL" in subject


class TestHelpers:
    """Tests for helper functions."""

    def test_recommendation_returns_volume_advice(self):
        """Recommendation for volume type should mention pipeline ingestion."""
        rec = _recommendation("volume")
        assert "ingestion" in rec.lower() or "pipeline" in rec.lower()

    def test_recommendation_returns_null_advice(self):
        """Recommendation for null_check should mention source connectivity."""
        rec = _recommendation("null_check")
        assert "null" in rec.lower() or "source" in rec.lower()

    def test_recommendation_returns_schema_advice(self):
        """Recommendation for schema_change should mention DDL changes."""
        rec = _recommendation("schema_change")
        assert "ddl" in rec.lower() or "schema" in rec.lower()

    def test_recommendation_returns_default_for_unknown(self):
        """Unknown anomaly types should get a generic recommendation."""
        rec = _recommendation("unknown_type")
        assert len(rec) > 10  # Should be a non-trivial string

    def test_severity_badge_critical_is_red(self):
        """Critical severity badge should use red color."""
        badge = _severity_badge("critical")
        assert "#dc2626" in badge

    def test_severity_badge_high_is_orange(self):
        """High severity badge should use orange color."""
        badge = _severity_badge("high")
        assert "#ea580c" in badge
