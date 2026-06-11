from __future__ import annotations

import logging
from datetime import UTC, datetime

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

    async def dispatch(self, anomaly, alert_rules=None) -> list:
        alerts = []
        if not self.alert_repo:
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
