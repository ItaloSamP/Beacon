from __future__ import annotations

import logging
import operator as op
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import (
    Agent,
    Alert,
    AlertStatus,
    Anomaly,
    DataSource,
    Pipeline,
    PipelineRun,
    User,
)
from app.infrastructure.notifiers.email import EmailNotifier

logger = logging.getLogger(__name__)

# Mapping from threshold operator string to Python operator function
_OPERATOR_MAP = {
    "gt": op.gt,
    "lt": op.lt,
    "gte": op.ge,
    "lte": op.le,
    "eq": op.eq,
}


def _resolve_metric_value(anomaly, metric: str) -> float:
    """Extract the relevant numeric value from an anomaly for rule evaluation."""
    if metric == "z_score":
        details = getattr(anomaly, "deviation_details", {}) or {}
        return abs(float(details.get("zscore", 0)))
    elif metric == "null_pct":
        details = getattr(anomaly, "deviation_details", {}) or {}
        return float(details.get("null_pct", 0))
    elif metric == "volume_delta_pct":
        details = getattr(anomaly, "deviation_details", {}) or {}
        return abs(float(details.get("deviation_pct", 0)))
    return 0.0


def _evaluate_rule(rule, anomaly) -> bool:
    """Check whether an anomaly's metric meets a rule's threshold."""
    rule_op = _OPERATOR_MAP.get(rule.operator)
    if rule_op is None:
        return False
    metric_value = _resolve_metric_value(anomaly, rule.metric)
    try:
        return rule_op(metric_value, rule.threshold)
    except (TypeError, ValueError):
        return False


class AlertDispatcher:
    def __init__(self, db: AsyncSession, alert_repo=None, notifier=None):
        self.db = db
        self.alert_repo = alert_repo
        self.notifier = notifier or EmailNotifier()

    async def _resolve_context(self, anomaly) -> tuple[str | None, str]:
        """Resolve user email and data source name from the anomaly chain."""
        user_email = None
        data_source_name = "Unknown"

        try:
            query = (
                select(User.email, DataSource.name)
                .select_from(Anomaly)
                .join(PipelineRun, PipelineRun.id == Anomaly.pipeline_run_id)
                .join(Pipeline, Pipeline.id == PipelineRun.pipeline_id)
                .join(DataSource, DataSource.id == Pipeline.data_source_id)
                .join(Agent, Agent.id == DataSource.agent_id)
                .join(User, User.id == Agent.user_id)
                .where(Anomaly.id == anomaly.id)
                .limit(1)
            )
            result = await self.db.execute(query)
            row = result.one_or_none()
            if row:
                user_email, data_source_name = row
                data_source_name = data_source_name or "Unknown"
        except Exception as e:
            logger.error(
                "Failed to resolve user email for anomaly %s: %s",
                getattr(anomaly, "id", "unknown"),
                str(e),
            )

        return user_email, data_source_name

    async def _load_active_rules(self, pipeline_id: UUID) -> list:
        """Load active alert rules for a pipeline."""
        from app.infrastructure.repositories.alert_rule_repo import AlertRuleRepository

        repo = AlertRuleRepository(self.db)
        return await repo.list_active_by_pipeline(pipeline_id)

    async def dispatch(self, anomaly, alert_rules=None, pipeline_id: UUID | None = None) -> list:
        alerts = []
        if not self.alert_repo:
            return alerts

        # If pipeline_id is provided, fetch active rules and evaluate thresholds
        if pipeline_id is not None:
            rules = await self._load_active_rules(pipeline_id)

            if not rules:
                # No rules configured → skip alert entirely
                return alerts

            # Check if any active rule's threshold is met
            should_alert = any(_evaluate_rule(rule, anomaly) for rule in rules)
            if not should_alert:
                return alerts

        # Create the alert record
        alert = Alert(
            anomaly_id=anomaly.id,
            channel="email",
            status=AlertStatus.sent,
            sent_at=datetime.now(UTC),
        )
        alert = await self.alert_repo.create(alert)

        # Resolve user email and data source name for the notification
        user_email, data_source_name = await self._resolve_context(anomaly)

        # Send the notification if we have an email
        if user_email:
            result = await self.notifier.send_alert(
                anomaly, user_email, data_source_name
            )
            if result.get("status") == "failed":
                alert.status = AlertStatus.failed
                alert.error_message = str(result.get("error_message", ""))[:500]
                await self.alert_repo.db.flush()
                await self.alert_repo.db.refresh(alert)
                logger.warning(
                    "Alert %s marked as failed: %s",
                    alert.id,
                    alert.error_message,
                )
            else:
                logger.info("Alert %s sent successfully to %s", alert.id, user_email)
        else:
            logger.warning(
                "Alert %s created but no user email resolved — notification skipped",
                alert.id,
            )

        alerts.append(alert)
        return alerts
