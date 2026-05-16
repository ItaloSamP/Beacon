"""
Integration tests for Anomaly CRUD endpoints.

Tests full HTTP lifecycle:
- POST /api/v1/anomalies (201 create via agent token)
- GET /api/v1/anomalies (200 list with filters, paginated)
- GET /api/v1/anomalies/{id} (200 detail with relations)
- POST /api/v1/anomalies/{id}/resolve (200 resolve)
- GET /api/v1/anomalies/recent (200 dashboard)
- Auth requirements (401, agent token)
- Validation (422 invalid severity, 404 missing)

RED PHASE: All tests WILL FAIL because anomaly routes don't exist yet.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import assert_response_shape, assert_error_response


class TestCreateAnomaly:
    """POST /api/v1/anomalies"""

    @pytest.mark.asyncio
    async def test_create_returns_201(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """Happy path: create an anomaly returns 201."""
        # RED PHASE
        payload = {
            "pipeline_run_id": sample_pipeline_run["id"],
            "severity": "high",
            "type": "volume",
            "description": "Order count dropped 60% below baseline",
            "deviation_details": {
                "expected": 1000,
                "actual": 400,
                "deviation_pct": -60,
                "zscore": -3.5,
            },
        }

        response = await async_client.post(
            "/api/v1/anomalies", json=payload, headers=auth_headers
        )

        assert response.status_code == 201, (
            f"Expected 201, got {response.status_code}: {response.json()}"
        )

        body = response.json()
        assert body["error"] is None

        data = body["data"]
        assert data["pipeline_run_id"] == sample_pipeline_run["id"]
        assert data["severity"] == "high"
        assert data["type"] == "volume"
        assert data["description"] == payload["description"]
        assert data["id"] is not None
        assert data["detected_at"] is not None
        assert data.get("resolved_at") is None, "New anomaly should not be resolved"

    @pytest.mark.asyncio
    async def test_create_with_minimal_fields(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """Creating with only required fields (pipeline_run_id, severity, type) succeeds."""
        # RED PHASE
        payload = {
            "pipeline_run_id": sample_pipeline_run["id"],
            "severity": "low",
            "type": "null_check",
        }

        response = await async_client.post(
            "/api/v1/anomalies", json=payload, headers=auth_headers
        )
        assert response.status_code == 201, (
            f"Expected 201, got {response.status_code}: {response.json()}"
        )

        data = response.json()["data"]
        assert data["severity"] == "low"
        assert data["type"] == "null_check"

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, async_client: AsyncClient):
        """Creating without auth returns 401."""
        # RED PHASE
        response = await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": "00000000-0000-0000-0000-000000000000",
                "severity": "low",
                "type": "volume",
            },
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_invalid_severity(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """Creating with invalid severity returns 422."""
        # RED PHASE
        payload = {
            "pipeline_run_id": sample_pipeline_run["id"],
            "severity": "extreme",
            "type": "volume",
        }

        response = await async_client.post(
            "/api/v1/anomalies", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_missing_pipeline_run_id(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Creating without pipeline_run_id returns 422."""
        # RED PHASE
        payload = {
            "severity": "medium",
            "type": "volume",
        }

        response = await async_client.post(
            "/api/v1/anomalies", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_nonexistent_pipeline_run(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Creating with a non-existent pipeline_run_id returns 404 or 422."""
        # RED PHASE
        payload = {
            "pipeline_run_id": "00000000-0000-0000-0000-000000000000",
            "severity": "medium",
            "type": "volume",
        }

        response = await async_client.post(
            "/api/v1/anomalies", json=payload, headers=auth_headers
        )
        assert response.status_code in (404, 422), (
            f"Expected 404 or 422, got {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_create_with_agent_token(
        self, async_client: AsyncClient, agent_token: dict,
        sample_pipeline_run: dict
    ):
        """Agent token should be accepted for creating anomalies."""
        # RED PHASE
        payload = {
            "pipeline_run_id": sample_pipeline_run["id"],
            "severity": "high",
            "type": "volume",
            "description": "Detected by agent",
        }

        response = await async_client.post(
            "/api/v1/anomalies", json=payload, headers=agent_token["headers"]
        )
        assert response.status_code == 201, (
            f"Agent token should allow anomaly creation, got {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_create_all_severity_levels(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """Should accept all valid severity levels: low, medium, high, critical."""
        # RED PHASE
        severities = ["low", "medium", "high", "critical"]

        for severity in severities:
            payload = {
                "pipeline_run_id": sample_pipeline_run["id"],
                "severity": severity,
                "type": "volume",
            }
            response = await async_client.post(
                "/api/v1/anomalies", json=payload, headers=auth_headers
            )
            assert response.status_code == 201, (
                f"Severity '{severity}' should be valid, got {response.status_code}"
            )


class TestListAnomalies:
    """GET /api/v1/anomalies"""

    @pytest.mark.asyncio
    async def test_list_returns_200_with_pagination(
        self, async_client: AsyncClient, auth_headers: dict, sample_anomaly: dict
    ):
        """Happy path: list anomalies returns 200 with paginated response."""
        # RED PHASE
        response = await async_client.get("/api/v1/anomalies", headers=auth_headers)

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        body = response.json()
        assert body["error"] is None
        assert "data" in body
        assert isinstance(body["data"], list)
        assert "meta" in body

        meta = body["meta"]
        assert "page" in meta
        assert "per_page" in meta
        assert "total" in meta

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, async_client: AsyncClient):
        """Listing anomalies without auth returns 401."""
        # RED PHASE
        response = await async_client.get("/api/v1/anomalies")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_contains_created_anomaly(
        self, async_client: AsyncClient, auth_headers: dict, sample_anomaly: dict
    ):
        """After creating, anomaly should appear in the list."""
        # RED PHASE
        response = await async_client.get("/api/v1/anomalies", headers=auth_headers)

        body = response.json()
        ids = [a["id"] for a in body["data"]]
        assert sample_anomaly["id"] in ids, "Created anomaly should appear in list"

    @pytest.mark.asyncio
    async def test_list_filter_by_severity(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """List should support filtering by severity."""
        # RED PHASE
        # Create low and high anomalies
        await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": sample_pipeline_run["id"],
                "severity": "low",
                "type": "volume",
            },
            headers=auth_headers,
        )
        await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": sample_pipeline_run["id"],
                "severity": "high",
                "type": "volume",
            },
            headers=auth_headers,
        )

        response = await async_client.get(
            "/api/v1/anomalies?severity=high", headers=auth_headers
        )
        body = response.json()
        for anomaly in body["data"]:
            assert anomaly["severity"] == "high", (
                f"Filtered results should only contain high, got {anomaly['severity']}"
            )

    @pytest.mark.asyncio
    async def test_list_filter_by_type(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """List should support filtering by type."""
        # RED PHASE
        await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": sample_pipeline_run["id"],
                "severity": "low",
                "type": "volume",
            },
            headers=auth_headers,
        )
        await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": sample_pipeline_run["id"],
                "severity": "low",
                "type": "null_check",
            },
            headers=auth_headers,
        )

        response = await async_client.get(
            "/api/v1/anomalies?type=null_check", headers=auth_headers
        )
        for anomaly in response.json()["data"]:
            assert anomaly["type"] == "null_check"

    @pytest.mark.asyncio
    async def test_list_filter_by_resolved(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """List should support filtering by resolved status."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/anomalies?resolved=false", headers=auth_headers
        )
        body = response.json()

        assert response.status_code == 200
        for anomaly in body["data"]:
            assert anomaly.get("resolved_at") is None, (
                "Filtering by resolved=false should return only unresolved anomalies"
            )

    @pytest.mark.asyncio
    async def test_list_pagination(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """Pagination should respect page and per_page parameters."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/anomalies?page=1&per_page=2", headers=auth_headers
        )
        body = response.json()
        assert body["meta"]["per_page"] == 2
        assert len(body["data"]) <= 2


class TestGetAnomaly:
    """GET /api/v1/anomalies/{id}"""

    @pytest.mark.asyncio
    async def test_get_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_anomaly: dict
    ):
        """Happy path: get anomaly by ID returns 200 with full detail."""
        # RED PHASE
        anomaly_id = sample_anomaly["id"]

        response = await async_client.get(
            f"/api/v1/anomalies/{anomaly_id}", headers=auth_headers
        )

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        data = response.json()["data"]
        assert data["id"] == anomaly_id
        assert data["severity"] == sample_anomaly["severity"]
        assert data["type"] == sample_anomaly["type"]
        assert data["pipeline_run_id"] == sample_anomaly["pipeline_run_id"]

    @pytest.mark.asyncio
    async def test_get_includes_pipeline_run_relation(
        self, async_client: AsyncClient, auth_headers: dict, sample_anomaly: dict
    ):
        """Detail should include pipeline_run info (with pipeline and data_source)."""
        # RED PHASE
        response = await async_client.get(
            f"/api/v1/anomalies/{sample_anomaly['id']}", headers=auth_headers
        )
        assert response.status_code == 200

        data = response.json()["data"]
        if "pipeline_run" in data:
            pr = data["pipeline_run"]
            assert "id" in pr
            assert "pipeline_id" in pr
            if "pipeline" in pr:
                assert "name" in pr["pipeline"]
            if "data_source" in pr:
                assert "name" in pr["data_source"]

    @pytest.mark.asyncio
    async def test_get_includes_alerts(
        self, async_client: AsyncClient, auth_headers: dict, sample_anomaly: dict
    ):
        """Detail should include associated alerts (may be empty)."""
        # RED PHASE
        response = await async_client.get(
            f"/api/v1/anomalies/{sample_anomaly['id']}", headers=auth_headers
        )
        assert response.status_code == 200

        data = response.json()["data"]
        if "alerts" in data:
            assert isinstance(data["alerts"], list)

    @pytest.mark.asyncio
    async def test_get_requires_auth(
        self, async_client: AsyncClient, sample_anomaly: dict
    ):
        """Getting anomaly without auth returns 401."""
        # RED PHASE
        response = await async_client.get(
            f"/api/v1/anomalies/{sample_anomaly['id']}"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_nonexistent_anomaly(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Getting non-existent anomaly returns 404."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/anomalies/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_malformed_uuid(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Getting with malformed UUID returns 422."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/anomalies/not-a-uuid", headers=auth_headers
        )
        assert response.status_code == 422


class TestResolveAnomaly:
    """POST /api/v1/anomalies/{id}/resolve"""

    @pytest.mark.asyncio
    async def test_resolve_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_anomaly: dict
    ):
        """Happy path: resolve an anomaly returns 200 with resolved_at set."""
        # RED PHASE
        anomaly_id = sample_anomaly["id"]

        response = await async_client.post(
            f"/api/v1/anomalies/{anomaly_id}/resolve", headers=auth_headers
        )

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        data = response.json()["data"]
        assert data["id"] == anomaly_id
        assert data["resolved_at"] is not None, "resolved_at should be set after resolve"

    @pytest.mark.asyncio
    async def test_resolve_requires_auth(
        self, async_client: AsyncClient, sample_anomaly: dict
    ):
        """Resolving without auth returns 401."""
        # RED PHASE
        response = await async_client.post(
            f"/api/v1/anomalies/{sample_anomaly['id']}/resolve"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_resolve_nonexistent_anomaly(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Resolving non-existent anomaly returns 404."""
        # RED PHASE
        response = await async_client.post(
            "/api/v1/anomalies/00000000-0000-0000-0000-000000000000/resolve",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resolve_already_resolved(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """Resolving an already resolved anomaly should be idempotent (200)."""
        # RED PHASE
        # Create and resolve an anomaly
        create_resp = await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": sample_pipeline_run["id"],
                "severity": "medium",
                "type": "volume",
            },
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        anomaly_id = create_resp.json()["data"]["id"]

        # First resolve
        resolve1 = await async_client.post(
            f"/api/v1/anomalies/{anomaly_id}/resolve", headers=auth_headers
        )
        assert resolve1.status_code == 200

        # Second resolve (already resolved)
        resolve2 = await async_client.post(
            f"/api/v1/anomalies/{anomaly_id}/resolve", headers=auth_headers
        )
        assert resolve2.status_code == 200, (
            f"Re-resolving should be idempotent (200), got {resolve2.status_code}"
        )

    @pytest.mark.asyncio
    async def test_resolve_malformed_uuid(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Resolving with malformed UUID returns 422."""
        # RED PHASE
        response = await async_client.post(
            "/api/v1/anomalies/not-a-uuid/resolve", headers=auth_headers
        )
        assert response.status_code == 422


class TestRecentAnomalies:
    """GET /api/v1/anomalies/recent"""

    @pytest.mark.asyncio
    async def test_recent_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_anomaly: dict
    ):
        """Happy path: recent anomalies returns 200 with array."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/anomalies/recent", headers=auth_headers
        )

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        body = response.json()
        assert body["error"] is None
        assert "data" in body
        assert isinstance(body["data"], list)

    @pytest.mark.asyncio
    async def test_recent_requires_auth(self, async_client: AsyncClient):
        """Getting recent anomalies without auth returns 401."""
        # RED PHASE
        response = await async_client.get("/api/v1/anomalies/recent")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_recent_contains_created_anomaly(
        self, async_client: AsyncClient, auth_headers: dict, sample_anomaly: dict
    ):
        """Recently created anomaly should appear in the recent list."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/anomalies/recent?limit=50", headers=auth_headers
        )
        assert response.status_code == 200

        ids = [a["id"] for a in response.json()["data"]]
        assert sample_anomaly["id"] in ids, "Created anomaly should appear in recent"

    @pytest.mark.asyncio
    async def test_recent_respects_limit(
        self, async_client: AsyncClient, auth_headers: dict, sample_anomaly: dict
    ):
        """Recent endpoint should respect the limit query parameter."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/anomalies/recent?limit=3", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) <= 3


class TestAnomalyAuth:
    """Auth and user isolation for anomaly endpoints."""

    @pytest.mark.asyncio
    async def test_user_cannot_see_other_users_anomalies(
        self, async_client: AsyncClient, test_db
    ):
        """Anomalies from user A should not appear in user B's list."""
        # RED PHASE
        # User A creates pipeline run + anomaly
        reg_a = await async_client.post("/api/v1/auth/register", json={
            "email": "anom-user-a@example.com",
            "password": "StrongPass123!",
            "name": "Anom User A",
        })
        token_a = reg_a.json()["data"]["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        agent_a = await async_client.post(
            "/api/v1/agents",
            json={"name": "A Agent", "status": "online"},
            headers=headers_a,
        )
        ds_a = await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "A DS",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
                "agent_id": agent_a.json()["data"]["id"],
            },
            headers=headers_a,
        )
        pipe_a = await async_client.post(
            "/api/v1/pipelines",
            json={
                "name": "A Pipe",
                "type": "volume",
                "data_source_id": ds_a.json()["data"]["id"],
                "config": {},
            },
            headers=headers_a,
        )
        run_a = await async_client.post(
            f"/api/v1/pipelines/{pipe_a.json()['data']['id']}/run",
            headers=headers_a,
        )
        run_id = run_a.json()["data"]["run_id"]

        anom_a = await async_client.post(
            "/api/v1/anomalies",
            json={
                "pipeline_run_id": run_id,
                "severity": "critical",
                "type": "volume",
            },
            headers=headers_a,
        )
        anomaly_id = anom_a.json()["data"]["id"]

        # User B
        reg_b = await async_client.post("/api/v1/auth/register", json={
            "email": "anom-user-b@example.com",
            "password": "StrongPass123!",
            "name": "Anom User B",
        })
        token_b = reg_b.json()["data"]["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B should not see A's anomaly in list
        list_b = await async_client.get("/api/v1/anomalies", headers=headers_b)
        list_ids = [a["id"] for a in list_b.json()["data"]]
        assert anomaly_id not in list_ids, "User B should not see user A's anomaly"

        # User B should get 404 on direct access
        get_b = await async_client.get(
            f"/api/v1/anomalies/{anomaly_id}", headers=headers_b
        )
        assert get_b.status_code == 404


class TestAnomalyValidation:
    """Validation edge cases for anomaly endpoints."""

    @pytest.mark.asyncio
    async def test_create_empty_type(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """Creating with empty type returns 422."""
        # RED PHASE
        payload = {
            "pipeline_run_id": sample_pipeline_run["id"],
            "severity": "medium",
            "type": "",
        }
        response = await async_client.post(
            "/api/v1/anomalies", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_missing_type(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """Creating without type returns 422."""
        # RED PHASE
        payload = {
            "pipeline_run_id": sample_pipeline_run["id"],
            "severity": "medium",
        }
        response = await async_client.post(
            "/api/v1/anomalies", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_missing_severity(
        self, async_client: AsyncClient, auth_headers: dict,
        sample_pipeline_run: dict
    ):
        """Creating without severity returns 422."""
        # RED PHASE
        payload = {
            "pipeline_run_id": sample_pipeline_run["id"],
            "type": "volume",
        }
        response = await async_client.post(
            "/api/v1/anomalies", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_recent_negative_limit(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Recent with negative limit returns 422."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/anomalies/recent?limit=-1", headers=auth_headers
        )
        assert response.status_code == 422
