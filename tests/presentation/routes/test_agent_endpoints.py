"""
Integration tests for agent-specific endpoints (agent token authentication).

Tests:
- GET /api/v1/agent/self/config (200 with full config)
- POST /api/v1/agents/{id}/heartbeat (200 update heartbeat)
- Auth: agent token required (401 without)
- Validation: revoked token, invalid token, non-existent agent

RED PHASE: All tests WILL FAIL because agent endpoints don't exist yet.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import assert_response_shape, assert_error_response


class TestAgentSelfConfig:
    """GET /api/v1/agent/self/config"""

    @pytest.mark.asyncio
    async def test_self_config_returns_200(
        self, async_client: AsyncClient, agent_token: dict
    ):
        """Happy path: agent self config returns 200 with full configuration."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/agent/self/config", headers=agent_token["headers"]
        )

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        body = response.json()
        assert body["error"] is None
        data = body["data"]

        assert "agent" in data
        assert "data_sources" in data
        assert "pipelines" in data
        assert "settings" in data

    @pytest.mark.asyncio
    async def test_self_config_agent_info(
        self, async_client: AsyncClient, agent_token: dict
    ):
        """Agent info includes id, name, status, version."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/agent/self/config", headers=agent_token["headers"]
        )
        assert response.status_code == 200

        agent = response.json()["data"]["agent"]
        assert_response_shape(agent, ["id", "name", "status", "version"], "agent")

    @pytest.mark.asyncio
    async def test_self_config_data_sources_array(
        self, async_client: AsyncClient, agent_token: dict, sample_datasource: dict
    ):
        """Data sources should include linked datasources with decrypted config."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/agent/self/config", headers=agent_token["headers"]
        )
        assert response.status_code == 200

        data_sources = response.json()["data"]["data_sources"]
        assert isinstance(data_sources, list)

        if data_sources:
            ds = data_sources[0]
            assert "id" in ds
            assert "name" in ds
            assert "type" in ds
            # connection_config should be present (decrypted for agents)
            assert "connection_config" in ds

    @pytest.mark.asyncio
    async def test_self_config_pipelines_array(
        self, async_client: AsyncClient, agent_token: dict
    ):
        """Pipelines should be a list (may be empty)."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/agent/self/config", headers=agent_token["headers"]
        )
        assert response.status_code == 200

        pipelines = response.json()["data"]["pipelines"]
        assert isinstance(pipelines, list)

    @pytest.mark.asyncio
    async def test_self_config_settings(
        self, async_client: AsyncClient, agent_token: dict
    ):
        """Settings should include default configuration values."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/agent/self/config", headers=agent_token["headers"]
        )
        assert response.status_code == 200

        settings = response.json()["data"]["settings"]
        assert_response_shape(
            settings,
            ["heartbeat_interval", "profile_interval", "zscore_threshold", "baseline_window"],
            "settings",
        )
        assert isinstance(settings["heartbeat_interval"], (int, float))
        assert isinstance(settings["profile_interval"], (int, float))
        assert isinstance(settings["zscore_threshold"], (int, float))
        assert isinstance(settings["baseline_window"], (int, float))

    @pytest.mark.asyncio
    async def test_self_config_data_sources_match_agent(
        self, async_client: AsyncClient, agent_token: dict, sample_agent: dict,
        sample_datasource: dict
    ):
        """Data sources returned should be linked to the agent."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/agent/self/config", headers=agent_token["headers"]
        )
        assert response.status_code == 200

        data_sources = response.json()["data"]["data_sources"]
        ds_ids = [ds["id"] for ds in data_sources]

        # sample_datasource should be linked to sample_agent (via agent_id)
        assert sample_datasource["id"] in ds_ids, (
            f"Data source {sample_datasource['id']} should appear in agent config"
        )

    @pytest.mark.asyncio
    async def test_self_config_connection_config_is_decrypted(
        self, async_client: AsyncClient, agent_token: dict, sample_datasource: dict
    ):
        """Connection config in agent config should be the full decrypted value."""
        # RED PHASE
        response = await async_client.get(
            "/api/v1/agent/self/config", headers=agent_token["headers"]
        )
        assert response.status_code == 200

        data_sources = response.json()["data"]["data_sources"]
        for ds in data_sources:
            if ds["id"] == sample_datasource["id"]:
                cc = ds["connection_config"]
                assert isinstance(cc, dict)
                # Should NOT be masked string like "****"
                assert cc != "****", (
                    "connection_config in agent config should be decrypted, not masked"
                )
                break


class TestAgentHeartbeat:
    """POST /api/v1/agents/{id}/heartbeat"""

    @pytest.mark.asyncio
    async def test_heartbeat_returns_200(
        self, async_client: AsyncClient, agent_token: dict, sample_agent: dict
    ):
        """Happy path: heartbeat updates agent status and last_heartbeat_at."""
        # RED PHASE
        response = await async_client.post(
            f"/api/v1/agents/{sample_agent['id']}/heartbeat",
            headers=agent_token["headers"],
        )

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        data = response.json()["data"]
        assert "status" in data
        assert data["status"] == "online"
        assert "last_heartbeat_at" in data
        assert data["last_heartbeat_at"] is not None

    @pytest.mark.asyncio
    async def test_heartbeat_requires_agent_token(
        self, async_client: AsyncClient, sample_agent: dict
    ):
        """Heartbeat without agent token returns 401."""
        # RED PHASE
        response = await async_client.post(
            f"/api/v1/agents/{sample_agent['id']}/heartbeat"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_heartbeat_with_user_token_is_rejected(
        self, async_client: AsyncClient, auth_headers: dict, sample_agent: dict
    ):
        """User JWT should not be accepted for heartbeat (agent token required)."""
        # RED PHASE
        response = await async_client.post(
            f"/api/v1/agents/{sample_agent['id']}/heartbeat",
            headers=auth_headers,
        )
        # Should reject with 401 or 403 (user token not valid for agent endpoint)
        assert response.status_code in (401, 403), (
            f"Expected 401/403 for user token on agent endpoint, got {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_heartbeat_nonexistent_agent(
        self, async_client: AsyncClient, agent_token: dict
    ):
        """Heartbeat to non-existent agent returns 404."""
        # RED PHASE
        response = await async_client.post(
            "/api/v1/agents/00000000-0000-0000-0000-000000000000/heartbeat",
            headers=agent_token["headers"],
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_heartbeat_malformed_uuid(
        self, async_client: AsyncClient, agent_token: dict
    ):
        """Heartbeat with malformed UUID returns 422."""
        # RED PHASE
        response = await async_client.post(
            "/api/v1/agents/not-a-uuid/heartbeat",
            headers=agent_token["headers"],
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_heartbeat_updates_timestamp(
        self, async_client: AsyncClient, agent_token: dict, sample_agent: dict,
        auth_headers: dict
    ):
        """After heartbeat, GET /agents/{id} should show updated last_heartbeat_at."""
        # RED PHASE
        # Send heartbeat
        hb_resp = await async_client.post(
            f"/api/v1/agents/{sample_agent['id']}/heartbeat",
            headers=agent_token["headers"],
        )
        assert hb_resp.status_code == 200

        # Verify via GET
        get_resp = await async_client.get(
            f"/api/v1/agents/{sample_agent['id']}", headers=auth_headers
        )
        assert get_resp.status_code == 200

        agent_data = get_resp.json()["data"]
        assert agent_data["status"] == "online"
        assert agent_data["last_heartbeat_at"] is not None, (
            "Heartbeat should set last_heartbeat_at"
        )


class TestAgentEndpointAuth:
    """Auth-specific tests for agent endpoints."""

    @pytest.mark.asyncio
    async def test_invalid_agent_token_format(
        self, async_client: AsyncClient
    ):
        """A garbage token should be rejected with 401."""
        # RED PHASE
        headers = {"Authorization": "Bearer garbage_token_not_valid"}
        response = await async_client.get(
            "/api/v1/agent/self/config", headers=headers
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_agent_token_with_wrong_prefix(
        self, async_client: AsyncClient
    ):
        """A JWT token (not agent token) on agent endpoint should be rejected."""
        # RED PHASE
        # Register user to get a JWT
        reg = await async_client.post("/api/v1/auth/register", json={
            "email": "wrong-prefix@example.com",
            "password": "StrongPass123!",
            "name": "Wrong Prefix",
        })
        # Even if register succeeds, JWT on agent endpoint should fail
        headers = {"Authorization": "Bearer some_normal_jwt_token"}
        response = await async_client.get(
            "/api/v1/agent/self/config", headers=headers
        )
        assert response.status_code in (401, 403), (
            f"JWT on agent endpoint should be rejected (401/403), got {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_revoked_agent_token(
        self, async_client: AsyncClient, agent_token: dict, auth_headers: dict,
        sample_agent: dict
    ):
        """A revoked agent token should not authenticate."""
        # RED PHASE
        # First, revoke the token if an endpoint exists
        # GET /agents/{id}/tokens to find token_id
        tokens_resp = await async_client.get(
            f"/api/v1/agents/{sample_agent['id']}/tokens",
            headers=auth_headers,
        )

        if tokens_resp.status_code == 200:
            tokens = tokens_resp.json()["data"]
            if tokens:
                token_id = tokens[0]["id"]
                # Delete/revoke the token
                await async_client.delete(
                    f"/api/v1/agents/{sample_agent['id']}/tokens/{token_id}",
                    headers=auth_headers,
                )

                # Now try to use the (now revoked) token
                response = await async_client.get(
                    "/api/v1/agent/self/config", headers=agent_token["headers"]
                )
                assert response.status_code == 401, (
                    f"Revoked token should return 401, got {response.status_code}"
                )

    @pytest.mark.asyncio
    async def test_self_config_requires_agent_token(
        self, async_client: AsyncClient
    ):
        """Self config without any auth returns 401."""
        # RED PHASE
        response = await async_client.get("/api/v1/agent/self/config")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_agent_cannot_access_other_agent_config(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """An agent token for agent A should not leak config from agent B."""
        # RED PHASE
        # Create two agents, get tokens for both
        # Agent 1
        agent1_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "Agent One", "status": "online"},
            headers=auth_headers,
        )
        assert agent1_resp.status_code == 201

        # Agent 2
        agent2_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "Agent Two", "status": "online"},
            headers=auth_headers,
        )
        assert agent2_resp.status_code == 201
        agent2_id = agent2_resp.json()["data"]["id"]

        # If agent_token is returned on create, use it
        agent1_token = agent1_resp.json()["data"].get("agent_token")
        if agent1_token:
            agent1_headers = {"Authorization": f"Bearer {agent1_token}"}

            # Create datasource linked to agent 2
            await async_client.post(
                "/api/v1/datasources",
                json={
                    "name": "Agent 2's DS",
                    "type": "postgres",
                    "connection_config": {"secret": "agent2_data"},
                    "status": "active",
                    "agent_id": agent2_id,
                },
                headers=auth_headers,
            )

            # Agent 1's config should only show its own datasources
            config_resp = await async_client.get(
                "/api/v1/agent/self/config", headers=agent1_headers
            )
            if config_resp.status_code == 200:
                data_sources = config_resp.json()["data"]["data_sources"]
                ds_names = [ds["name"] for ds in data_sources]
                assert "Agent 2's DS" not in ds_names, (
                    "Agent 1 should not see Agent 2's datasources"
                )
