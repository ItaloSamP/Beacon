from __future__ import annotations

from datetime import UTC, datetime

import pytest
from httpx import AsyncClient

from app.domain.models import Alert, AlertChannel, AlertStatus


class TestAlertCrossUserIsolation:
    """M-5c: Alert repository filters by user_id (cross-user isolation)."""

    @pytest.mark.asyncio
    async def test_user_cannot_see_other_users_alerts(
        self, async_client: AsyncClient, test_db
    ):
        """Alerts from user A should not appear in user B's list."""
        # Register User A
        reg_a = await async_client.post("/api/v1/auth/register", json={
            "email": "alert-user-a@example.com",
            "password": "StrongPass123!",
            "name": "Alert User A",
        })
        assert reg_a.status_code == 201
        token_a = reg_a.json()["data"]["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # User A: create agent → datasource → pipeline → run → anomaly
        agent_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "A's Agent", "status": "online"},
            headers=headers_a,
        )
        agent_id = agent_resp.json()["data"]["id"]

        ds_resp = await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "A's DS",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
                "agent_id": agent_id,
            },
            headers=headers_a,
        )
        ds_id = ds_resp.json()["data"]["id"]

        pipe_resp = await async_client.post(
            "/api/v1/pipelines",
            json={
                "name": "A's Pipeline",
                "type": "volume",
                "data_source_id": ds_id,
                "config": {},
            },
            headers=headers_a,
        )
        pipe_id = pipe_resp.json()["data"]["id"]

        run_resp = await async_client.post(
            f"/api/v1/pipelines/{pipe_id}/run", headers=headers_a
        )
        assert run_resp.status_code == 202
        run_id = run_resp.json()["data"]["run_id"]

        # Create an anomaly via agent token
        agent_token_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "A's Token Agent", "status": "online"},
            headers=headers_a,
        )
        agent_token_str = agent_token_resp.json()["data"]["agent_token"]
        agent_headers = {"Authorization": f"Bearer {agent_token_str}"}

        anom_resp = await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": run_id,
                "severity": "high",
                "type": "volume",
                "description": "Test anomaly for alert isolation",
            },
            headers=agent_headers,
        )
        assert anom_resp.status_code == 201
        anomaly_id = anom_resp.json()["data"]["id"]

        # Seed an alert linked to A's anomaly directly via DB
        from uuid import UUID

        from app.domain.models import Alert, AlertChannel, AlertStatus
        alert = Alert(
            anomaly_id=UUID(anomaly_id),
            channel=AlertChannel.email,
            status=AlertStatus.sent,
            sent_at=datetime.now(UTC),
        )
        test_db.add(alert)
        await test_db.flush()

        # Register User B
        reg_b = await async_client.post("/api/v1/auth/register", json={
            "email": "alert-user-b@example.com",
            "password": "StrongPass123!",
            "name": "Alert User B",
        })
        assert reg_b.status_code == 201
        token_b = reg_b.json()["data"]["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B lists alerts — should NOT see A's alert
        list_b = await async_client.get("/api/v1/alerts", headers=headers_b)
        assert list_b.status_code == 200
        alert_ids = [a["id"] for a in list_b.json()["data"]]
        assert str(alert.id) not in alert_ids, (
            "User B should not see user A's alerts"
        )

    @pytest.mark.asyncio
    async def test_user_sees_only_own_alerts(
        self, async_client: AsyncClient, test_db
    ):
        """User A should see their own alerts in the list."""
        # Register User A
        reg_a = await async_client.post("/api/v1/auth/register", json={
            "email": "own-alert-a@example.com",
            "password": "StrongPass123!",
            "name": "Own Alert A",
        })
        assert reg_a.status_code == 201
        token_a = reg_a.json()["data"]["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # User A: create full chain
        agent_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "A's Agent", "status": "online"},
            headers=headers_a,
        )
        agent_id = agent_resp.json()["data"]["id"]

        ds_resp = await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "A's DS",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
                "agent_id": agent_id,
            },
            headers=headers_a,
        )
        ds_id = ds_resp.json()["data"]["id"]

        pipe_resp = await async_client.post(
            "/api/v1/pipelines",
            json={
                "name": "A's Pipeline",
                "type": "volume",
                "data_source_id": ds_id,
                "config": {},
            },
            headers=headers_a,
        )
        pipe_id = pipe_resp.json()["data"]["id"]

        run_resp = await async_client.post(
            f"/api/v1/pipelines/{pipe_id}/run", headers=headers_a
        )
        run_id = run_resp.json()["data"]["run_id"]

        # Create anomaly via agent token
        agent_token_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "Token Agent 2", "status": "online"},
            headers=headers_a,
        )
        agent_token_str = agent_token_resp.json()["data"]["agent_token"]
        agent_headers = {"Authorization": f"Bearer {agent_token_str}"}

        anom_resp = await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": run_id,
                "severity": "medium",
                "type": "volume",
            },
            headers=agent_headers,
        )
        anomaly_id = anom_resp.json()["data"]["id"]

        # Seed alert linked to A's anomaly
        from uuid import UUID
        alert = Alert(
            anomaly_id=UUID(anomaly_id),
            channel=AlertChannel.email,
            status=AlertStatus.sent,
            sent_at=datetime.now(UTC),
        )
        test_db.add(alert)
        await test_db.flush()

        # User A should see the alert
        list_a = await async_client.get("/api/v1/alerts", headers=headers_a)
        assert list_a.status_code == 200
        alert_ids = [a["id"] for a in list_a.json()["data"]]
        assert str(alert.id) in alert_ids, (
            "User A should see their own alert"
        )
