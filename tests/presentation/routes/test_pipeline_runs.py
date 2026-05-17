"""
Integration tests for Pipeline Run endpoints.

Tests full HTTP lifecycle:
- POST /api/v1/pipelines/{pipeline_id}/run (202 trigger)
- GET /api/v1/pipelines/{pipeline_id}/runs (200 paginated history)
- GET /api/v1/pipeline-runs/{run_id} (200 detail)
- GET /api/v1/pipeline-runs/recent (200 dashboard)
- Auth requirements (401)
- Validation (404 pipeline, 422 malformed UUID)

RED PHASE: All tests WILL FAIL because pipeline run routes don't exist yet.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import assert_response_shape, assert_error_response


class TestTriggerPipelineRun:
    """POST /api/v1/pipelines/{pipeline_id}/run"""

    @pytest.mark.asyncio
    async def test_trigger_returns_202(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict
    ):
        """Happy path: trigger a pipeline run returns 202 with run_id."""
        # RED PHASE
        pipeline_id = sample_pipeline["id"]

        response = await async_client.post(
            f"/api/v1/pipelines/{pipeline_id}/run", headers=auth_headers
        )

        assert response.status_code == 202, (
            f"Expected 202, got {response.status_code}: {response.json()}"
        )

        body = response.json()
        assert body["error"] is None, f"Expected no error, got {body['error']}"

        data = body["data"]
        assert "run_id" in data
        assert data["pipeline_id"] == pipeline_id
        assert data["status"] == "started"
        assert "message" in data

    @pytest.mark.asyncio
    async def test_trigger_requires_auth(
        self, async_client: AsyncClient, sample_pipeline: dict
    ):
        """Triggering a pipeline run without auth returns 401."""
        # RED PHASE
        response = await async_client.post(
            f"/api/v1/pipelines/{sample_pipeline['id']}/run"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_trigger_nonexistent_pipeline(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Triggering a non-existent pipeline returns 404."""
        # RED PHASE
        response = await async_client.post(
            "/api/v1/pipelines/00000000-0000-0000-0000-000000000000/run",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_trigger_malformed_uuid(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Triggering with malformed UUID returns 422."""
        # RED PHASE
        response = await async_client.post(
            "/api/v1/pipelines/not-a-uuid/run", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_trigger_returns_correct_shape(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict
    ):
        """Response shape includes run_id, pipeline_id, status, message."""
        # RED PHASE
        response = await async_client.post(
            f"/api/v1/pipelines/{sample_pipeline['id']}/run",
            headers=auth_headers,
        )
        assert response.status_code == 202
        data = response.json()["data"]
        assert_response_shape(
            data, ["run_id", "pipeline_id", "status", "message"], "run trigger"
        )

    @pytest.mark.asyncio
    async def test_trigger_disabled_pipeline_returns_error(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """Triggering a disabled pipeline should return 400 or 409."""
        # RED PHASE — create a disabled pipeline
        from tests.conftest import sample_datasource

        # We need a datasource first; since we can't depend on sample_datasource
        # without the fixture cascade, create inline
        ds_payload = {
            "name": "Disabled Pipe DS",
            "type": "postgres",
            "connection_config": {},
            "status": "active",
        }
        ds_resp = await async_client.post(
            "/api/v1/datasources", json=ds_payload, headers=auth_headers
        )
        assert ds_resp.status_code == 201
        ds_id = ds_resp.json()["data"]["id"]

        pipe_resp = await async_client.post(
            "/api/v1/pipelines",
            json={
                "name": "Disabled Pipeline",
                "type": "volume",
                "data_source_id": ds_id,
                "enabled": False,
                "config": {},
            },
            headers=auth_headers,
        )
        assert pipe_resp.status_code == 201
        pipe_id = pipe_resp.json()["data"]["id"]

        response = await async_client.post(
            f"/api/v1/pipelines/{pipe_id}/run", headers=auth_headers
        )
        assert response.status_code in (400, 409, 422), (
            f"Expected 400/409/422 for disabled pipeline, got {response.status_code}"
        )


class TestListPipelineRuns:
    """GET /api/v1/pipelines/{pipeline_id}/runs"""

    @pytest.mark.asyncio
    async def test_list_returns_200_with_pagination(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict
    ):
        """Happy path: list pipeline runs returns 200 with paginated response."""
        # RED PHASE
        pipeline_id = sample_pipeline["id"]

        response = await async_client.get(
            f"/api/v1/pipelines/{pipeline_id}/runs", headers=auth_headers
        )

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
    async def test_list_requires_auth(
        self, async_client: AsyncClient, sample_pipeline: dict
    ):
        """Listing pipeline runs without auth returns 401."""
        # RED PHASE
        response = await async_client.get(
            f"/api/v1/pipelines/{sample_pipeline['id']}/runs"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_nonexistent_pipeline(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Listing runs for non-existent pipeline returns 404."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/pipelines/00000000-0000-0000-0000-000000000000/runs",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_contains_triggered_run(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict
    ):
        """After triggering a run, it should appear in the history list."""
        # RED PHASE
        pipeline_id = sample_pipeline["id"]

        # Trigger a run
        trigger_resp = await async_client.post(
            f"/api/v1/pipelines/{pipeline_id}/run", headers=auth_headers
        )
        assert trigger_resp.status_code == 202
        run_id = trigger_resp.json()["data"]["run_id"]

        # List runs
        list_resp = await async_client.get(
            f"/api/v1/pipelines/{pipeline_id}/runs", headers=auth_headers
        )
        assert list_resp.status_code == 200

        run_ids = [run["id"] for run in list_resp.json()["data"]]
        assert run_id in run_ids, f"Triggered run {run_id} should appear in list"

    @pytest.mark.asyncio
    async def test_list_pagination_respects_per_page(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict
    ):
        """Pagination should respect per_page parameter."""
        # RED PHASE
        pipeline_id = sample_pipeline["id"]

        response = await async_client.get(
            f"/api/v1/pipelines/{pipeline_id}/runs?page=1&per_page=2",
            headers=auth_headers,
        )
        body = response.json()
        assert body["meta"]["per_page"] == 2
        assert len(body["data"]) <= 2

    @pytest.mark.asyncio
    async def test_list_response_contains_pipeline_info(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict
    ):
        """Each run in the list should include pipeline reference info."""
        # RED PHASE
        pipeline_id = sample_pipeline["id"]

        # Trigger a run
        await async_client.post(
            f"/api/v1/pipelines/{pipeline_id}/run", headers=auth_headers
        )

        response = await async_client.get(
            f"/api/v1/pipelines/{pipeline_id}/runs", headers=auth_headers
        )
        assert response.status_code == 200

        runs = response.json()["data"]
        if runs:
            run = runs[0]
            assert "pipeline_id" in run
            assert "status" in run
            assert "started_at" in run


class TestGetPipelineRun:
    """GET /api/v1/pipeline-runs/{run_id}"""

    @pytest.mark.asyncio
    async def test_get_run_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline_run: dict
    ):
        """Happy path: get a pipeline run by ID returns 200 with full detail."""
        # RED PHASE
        run_id = sample_pipeline_run["id"]

        response = await async_client.get(
            f"/api/v1/pipeline-runs/{run_id}", headers=auth_headers
        )

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        data = response.json()["data"]
        assert data["id"] == run_id
        assert data["pipeline_id"] == sample_pipeline_run["pipeline_id"]
        assert data["status"] == sample_pipeline_run["status"]
        assert "metrics_json" in data
        assert "started_at" in data

    @pytest.mark.asyncio
    async def test_get_run_requires_auth(
        self, async_client: AsyncClient, sample_pipeline_run: dict
    ):
        """Getting a pipeline run without auth returns 401."""
        # RED PHASE
        response = await async_client.get(
            f"/api/v1/pipeline-runs/{sample_pipeline_run['id']}"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_nonexistent_run(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Getting a non-existent run returns 404."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/pipeline-runs/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_run_malformed_uuid(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Getting with malformed UUID returns 422."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/pipeline-runs/not-a-uuid", headers=auth_headers
        )
        assert response.status_code == 422


class TestRecentPipelineRuns:
    """GET /api/v1/pipeline-runs/recent"""

    @pytest.mark.asyncio
    async def test_recent_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline_run: dict
    ):
        """Happy path: recent pipeline runs returns 200 with array."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/pipeline-runs/recent", headers=auth_headers
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
        """Getting recent runs without auth returns 401."""
        # RED PHASE
        response = await async_client.get("/api/v1/pipeline-runs/recent")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_recent_respects_limit(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline_run: dict
    ):
        """Recent endpoint should respect the limit query parameter."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/pipeline-runs/recent?limit=3", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) <= 3

    @pytest.mark.asyncio
    async def test_recent_contains_created_run(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline_run: dict
    ):
        """Recently created run should appear in the recent list."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/pipeline-runs/recent?limit=50", headers=auth_headers
        )
        assert response.status_code == 200

        run_ids = [run["id"] for run in response.json()["data"]]
        assert sample_pipeline_run["id"] in run_ids, (
            f"Created run should appear in recent list"
        )

    @pytest.mark.asyncio
    async def test_recent_default_limit(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline_run: dict
    ):
        """Recent endpoint should use a reasonable default limit (e.g. 10)."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/pipeline-runs/recent", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()["data"]
        # Default limit should be reasonable
        assert len(data) <= 20


class TestPipelineRunAuth:
    """Auth and user isolation tests for pipeline runs."""

    @pytest.mark.asyncio
    async def test_user_cannot_see_other_users_pipeline_runs(
        self, async_client: AsyncClient, test_db
    ):
        """Pipeline runs from user A should not appear in user B's list."""
        # RED PHASE
        # Register user A
        reg_a = await async_client.post("/api/v1/auth/register", json={
            "email": "run-user-a@example.com",
            "password": "StrongPass123!",
            "name": "Run User A",
        })
        assert reg_a.status_code == 201
        token_a = reg_a.json()["data"]["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # User A: create agent, datasource, pipeline, trigger run
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
        a_run_id = run_resp.json()["data"]["run_id"]

        # Register user B
        reg_b = await async_client.post("/api/v1/auth/register", json={
            "email": "run-user-b@example.com",
            "password": "StrongPass123!",
            "name": "Run User B",
        })
        token_b = reg_b.json()["data"]["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User B should not see A's pipeline runs
        list_resp = await async_client.get(
            f"/api/v1/pipelines/{pipe_id}/runs", headers=headers_b
        )
        # Should be 404 because pipeline belongs to user A
        assert list_resp.status_code == 404, (
            f"User B should get 404 for A's pipeline runs, got {list_resp.status_code}"
        )

    @pytest.mark.asyncio
    async def test_user_cannot_trigger_run_on_other_users_pipeline(
        self, async_client: AsyncClient, test_db
    ):
        """User B cannot trigger a run on user A's pipeline."""
        # RED PHASE
        reg_a = await async_client.post("/api/v1/auth/register", json={
            "email": "trig-user-a@example.com",
            "password": "StrongPass123!",
            "name": "Trig User A",
        })
        token_a = reg_a.json()["data"]["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        reg_b = await async_client.post("/api/v1/auth/register", json={
            "email": "trig-user-b@example.com",
            "password": "StrongPass123!",
            "name": "Trig User B",
        })
        token_b = reg_b.json()["data"]["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

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

        response = await async_client.post(
            f"/api/v1/pipelines/{pipe_id}/run", headers=headers_b
        )
        assert response.status_code == 404


class TestPipelineRunValidation:
    """Validation edge cases for pipeline run endpoints."""

    @pytest.mark.asyncio
    async def test_list_malformed_pipeline_uuid(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Listing runs with malformed pipeline UUID returns 422."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/pipelines/not-a-uuid/runs", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_recent_negative_limit(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Recent endpoint with negative limit should return 422."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/pipeline-runs/recent?limit=-1", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_recent_excessive_limit(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Recent endpoint with excessive limit should return 422."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/pipeline-runs/recent?limit=99999", headers=auth_headers
        )
        assert response.status_code == 422
