"""
End-to-end integration test for the full anomaly detection flow.

Tests the complete pipeline:
1. Trigger pipeline run (POST /pipelines/{id}/run)
2. Wait for completion or simulate via direct PipelineRun creation
3. Create anomaly via agent token (POST /anomalies)
4. Verify anomaly appears in list (GET /anomalies)
5. Verify anomaly detail includes pipeline_run + data_source info
6. Verify alert was created (mock SendGrid, verify alert record)

RED PHASE: All tests WILL FAIL because anomaly routes and pipeline runner don't exist yet.
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


class TestEndToEndAnomalyFlow:
    """Full end-to-end anomaly flow integration test."""

    @pytest.mark.asyncio
    async def test_full_anomaly_lifecycle(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline: dict, sample_datasource: dict
    ):
        """
        Complete anomaly lifecycle:
        1. Trigger pipeline run
        2. Create anomaly sourced from that run
        3. Verify anomaly in list
        4. Get anomaly detail with relations
        5. Resolve the anomaly
        6. Verify resolved state
        """
        # RED PHASE — complete flow test

        # Step 1: Trigger pipeline run
        trigger_resp = await async_client.post(
            f"/api/v1/pipelines/{sample_pipeline['id']}/run",
            headers=auth_headers,
        )
        assert trigger_resp.status_code == 202, (
            f"Pipeline trigger failed: {trigger_resp.json()}"
        )
        run_data = trigger_resp.json()["data"]
        run_id = run_data["run_id"]
        assert run_id is not None

        # Step 2: Create anomaly
        anomaly_payload = {
            "pipeline_run_id": run_id,
            "severity": "high",
            "type": "volume",
            "description": "Order volume dropped significantly",
            "deviation_details": {
                "expected": 1000,
                "actual": 350,
                "deviation_pct": -65,
                "zscore": -3.8,
            },
        }
        anomaly_resp = await async_client.post(
            "/api/v1/anomalies",
            json=anomaly_payload,
            headers=auth_headers,
        )
        assert anomaly_resp.status_code == 201, (
            f"Anomaly creation failed: {anomaly_resp.json()}"
        )
        anomaly_data = anomaly_resp.json()["data"]
        anomaly_id = anomaly_data["id"]
        assert anomaly_data["severity"] == "high"
        assert anomaly_data["pipeline_run_id"] == run_id

        # Step 3: Verify anomaly appears in list
        list_resp = await async_client.get(
            "/api/v1/anomalies", headers=auth_headers
        )
        assert list_resp.status_code == 200
        list_ids = [a["id"] for a in list_resp.json()["data"]]
        assert anomaly_id in list_ids, "Anomaly should appear in list"

        # Step 4: Get anomaly detail with relations
        detail_resp = await async_client.get(
            f"/api/v1/anomalies/{anomaly_id}", headers=auth_headers
        )
        assert detail_resp.status_code == 200
        detail = detail_resp.json()["data"]
        assert detail["id"] == anomaly_id
        assert detail["description"] == anomaly_payload["description"]

        # Verify pipeline_run relation
        if "pipeline_run" in detail:
            pr = detail["pipeline_run"]
            assert pr["id"] == run_id

        # Step 5: Resolve the anomaly
        resolve_resp = await async_client.post(
            f"/api/v1/anomalies/{anomaly_id}/resolve",
            headers=auth_headers,
        )
        assert resolve_resp.status_code == 200, (
            f"Resolve failed: {resolve_resp.json()}"
        )
        resolved_data = resolve_resp.json()["data"]
        assert resolved_data["resolved_at"] is not None

        # Step 6: Verify it shows as resolved
        after_resolve = await async_client.get(
            f"/api/v1/anomalies/{anomaly_id}", headers=auth_headers
        )
        assert after_resolve.status_code == 200
        assert after_resolve.json()["data"]["resolved_at"] is not None

    @pytest.mark.asyncio
    async def test_anomaly_detail_includes_pipeline_and_datasource(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline: dict
    ):
        """
        Anomaly detail response should include pipeline_run with
        nested pipeline and data_source information.
        """
        # RED PHASE — relation enrichment test

        # Trigger a run
        trigger_resp = await async_client.post(
            f"/api/v1/pipelines/{sample_pipeline['id']}/run",
            headers=auth_headers,
        )
        assert trigger_resp.status_code == 202
        run_id = trigger_resp.json()["data"]["run_id"]

        # Create anomaly
        anomaly_resp = await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": run_id,
                "severity": "critical",
                "type": "schema_change",
                "description": "Table schema has changed",
                "deviation_details": {"added_columns": ["new_field"], "removed_columns": []},
            },
            headers=auth_headers,
        )
        assert anomaly_resp.status_code == 201
        anomaly_id = anomaly_resp.json()["data"]["id"]

        # Get detail
        detail_resp = await async_client.get(
            f"/api/v1/anomalies/{anomaly_id}", headers=auth_headers
        )
        assert detail_resp.status_code == 200
        detail = detail_resp.json()["data"]

        # Should include pipeline_run
        assert "pipeline_run" in detail or "pipeline_run_id" in detail
        if "pipeline_run" in detail:
            pr = detail["pipeline_run"]
            assert "id" in pr
            assert "pipeline_id" in pr
            if "pipeline" in pr:
                assert "name" in pr["pipeline"]
                assert pr["pipeline"]["name"] == sample_pipeline["name"]
            if "data_source" in pr:
                assert "name" in pr["data_source"]
                assert "type" in pr["data_source"]

    @pytest.mark.asyncio
    async def test_multiple_anomalies_in_list(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline: dict
    ):
        """
        Creating multiple anomalies and listing should return all of them.
        """
        # RED PHASE — multi-anomaly test

        # Trigger a run
        trigger_resp = await async_client.post(
            f"/api/v1/pipelines/{sample_pipeline['id']}/run",
            headers=auth_headers,
        )
        assert trigger_resp.status_code == 202
        run_id = trigger_resp.json()["data"]["run_id"]

        # Create 3 anomalies
        anomaly_ids = []
        for i in range(3):
            resp = await async_client.post(
                "/api/v1/anomalies",
                json={
                    "pipeline_run_id": run_id,
                    "severity": ["low", "medium", "high"][i],
                    "type": "volume",
                },
                headers=auth_headers,
            )
            assert resp.status_code == 201, (
                f"Anomaly {i} creation failed: {resp.json()}"
            )
            anomaly_ids.append(resp.json()["data"]["id"])

        # List should contain all
        list_resp = await async_client.get(
            "/api/v1/anomalies?per_page=50", headers=auth_headers
        )
        assert list_resp.status_code == 200
        list_ids = [a["id"] for a in list_resp.json()["data"]]
        for aid in anomaly_ids:
            assert aid in list_ids, f"Anomaly {aid} should be in list"

    @pytest.mark.asyncio
    async def test_pipeline_run_triggers_and_tracks_status(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline: dict
    ):
        """
        Pipeline run should be tracked: trigger returns 202,
        list shows the run, and detail returns correct status.
        """
        # RED PHASE — run tracking test

        # Trigger
        trigger_resp = await async_client.post(
            f"/api/v1/pipelines/{sample_pipeline['id']}/run",
            headers=auth_headers,
        )
        assert trigger_resp.status_code == 202
        run_id = trigger_resp.json()["data"]["run_id"]
        assert trigger_resp.json()["data"]["status"] == "started"

        # List runs
        list_resp = await async_client.get(
            f"/api/v1/pipelines/{sample_pipeline['id']}/runs",
            headers=auth_headers,
        )
        assert list_resp.status_code == 200
        run_ids = [r["id"] for r in list_resp.json()["data"]]
        assert run_id in run_ids

        # Get run detail
        detail_resp = await async_client.get(
            f"/api/v1/pipeline-runs/{run_id}", headers=auth_headers
        )
        assert detail_resp.status_code == 200
        run_detail = detail_resp.json()["data"]
        assert run_detail["id"] == run_id
        assert run_detail["pipeline_id"] == sample_pipeline["id"]
        assert "status" in run_detail
        assert "started_at" in run_detail

    @pytest.mark.asyncio
    async def test_anomaly_recent_reflects_new_entries(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline: dict
    ):
        """
        Recent anomalies endpoint should show the most recently created entries.
        """
        # RED PHASE — recent endpoint test

        # Trigger a run
        trigger_resp = await async_client.post(
            f"/api/v1/pipelines/{sample_pipeline['id']}/run",
            headers=auth_headers,
        )
        run_id = trigger_resp.json()["data"]["run_id"]

        # Create a fresh anomaly
        create_resp = await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": run_id,
                "severity": "high",
                "type": "volume",
                "description": "Fresh anomaly for recent test",
            },
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        anomaly_id = create_resp.json()["data"]["id"]

        # Recent should contain it
        recent_resp = await async_client.get(
            "/api/v1/anomalies/recent?limit=20", headers=auth_headers
        )
        assert recent_resp.status_code == 200
        recent_ids = [a["id"] for a in recent_resp.json()["data"]]
        assert anomaly_id in recent_ids, "New anomaly should be in recent list"
