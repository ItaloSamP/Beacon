"""
Integration tests for Agent CRUD endpoints.

Tests full HTTP lifecycle:
- POST /api/v1/agents (201 create, 422 invalid, 401 no auth)
- GET /api/v1/agents (200 list with pagination, filters)
- GET /api/v1/agents/{id} (200 detail, 404 missing)
- PUT /api/v1/agents/{id} (200 update, 404 missing)
- DELETE /api/v1/agents/{id} (204 delete, 404 missing)
- User isolation (agent from user A not visible to user B)
- DataSource relationship (agent_id on datasource, SET NULL on delete)

RED PHASE: All tests WILL FAIL because the /api/v1/agents routes don't exist yet.
"""

import pytest
from httpx import AsyncClient


class TestCreateAgent:
    """POST /api/v1/agents"""

    @pytest.mark.asyncio
    async def test_create_returns_201(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        Happy path: create an Agent with valid data returns 201.
        """
        payload = {
            "name": "Servidor Producao",
            "status": "online",
            "version": "0.1.0",
        }

        response = await async_client.post(
            "/api/v1/agents", json=payload, headers=auth_headers
        )

        assert response.status_code == 201, (
            f"Expected 201, got {response.status_code}: {response.json()}"
        )

        body = response.json()
        assert body["error"] is None
        data = body["data"]

        assert data["name"] == "Servidor Producao"
        assert data["status"] == "online"
        assert data["version"] == "0.1.0"
        assert "id" in data, "Response should include id"
        assert "user_id" in data, "Response should include user_id"
        assert "created_at" in data, "Response should include created_at"
        assert data.get("last_heartbeat_at") is None, "New agent should have no heartbeat"

    @pytest.mark.asyncio
    async def test_create_minimal_fields(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        Creating an Agent with only name should succeed (status defaults to offline).
        """
        payload = {"name": "Agent Minimo"}

        response = await async_client.post(
            "/api/v1/agents", json=payload, headers=auth_headers
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"

        data = response.json()["data"]
        assert data["name"] == "Agent Minimo"
        # Status should default
        assert "status" in data

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, async_client: AsyncClient):
        """
        Creating an Agent without auth should return 401.
        """
        payload = {"name": "Unauthorized Agent", "status": "online"}
        response = await async_client.post("/api/v1/agents", json=payload)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_missing_name_returns_422(self, async_client: AsyncClient, auth_headers: dict):
        """
        Creating an Agent without name should return 422.
        """
        payload = {"status": "online"}
        response = await async_client.post(
            "/api/v1/agents", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_empty_name_returns_422(self, async_client: AsyncClient, auth_headers: dict):
        """
        Creating an Agent with empty name should return 422.
        """
        payload = {"name": "", "status": "online"}
        response = await async_client.post(
            "/api/v1/agents", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_whitespace_name_returns_422(self, async_client: AsyncClient, auth_headers: dict):
        """
        Creating an Agent with whitespace-only name should return 422.
        """
        payload = {"name": "   ", "status": "online"}
        response = await async_client.post(
            "/api/v1/agents", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_offline_agent(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        Creating an agent with status=offline should work.
        """
        payload = {"name": "Offline Agent", "status": "offline"}
        response = await async_client.post(
            "/api/v1/agents", json=payload, headers=auth_headers
        )
        assert response.status_code == 201
        assert response.json()["data"]["status"] == "offline"

    @pytest.mark.asyncio
    async def test_create_invalid_status_returns_422(self, async_client: AsyncClient, auth_headers: dict):
        """
        Creating an Agent with invalid status should return 422.
        """
        payload = {"name": "Bad Status", "status": "unknown"}
        response = await async_client.post(
            "/api/v1/agents", json=payload, headers=auth_headers
        )
        assert response.status_code == 422


class TestListAgents:
    """GET /api/v1/agents"""

    @pytest.mark.asyncio
    async def test_list_returns_200_with_pagination(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        Happy path: list Agents returns 200 with paginated response.
        """
        response = await async_client.get("/api/v1/agents", headers=auth_headers)

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        body = response.json()
        assert body["error"] is None
        assert "data" in body
        assert isinstance(body["data"], list)
        assert "meta" in body, "Paginated response should include 'meta'"

        meta = body["meta"]
        assert "page" in meta
        assert "per_page" in meta
        assert "total" in meta

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, async_client: AsyncClient):
        """
        Listing Agents without auth should return 401.
        """
        response = await async_client.get("/api/v1/agents")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_empty_returns_empty_array(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        Listing Agents when none exist should return empty data array.
        """
        response = await async_client.get("/api/v1/agents", headers=auth_headers)
        body = response.json()
        assert body["data"] == []
        assert body["meta"]["total"] == 0

    @pytest.mark.asyncio
    async def test_list_contains_created_agent(
        self, async_client: AsyncClient, auth_headers: dict, sample_agent: dict, test_db
    ):
        """
        After creating an agent, it should appear in the list.
        """
        response = await async_client.get("/api/v1/agents", headers=auth_headers)

        body = response.json()
        ids = [agent["id"] for agent in body["data"]]
        assert sample_agent["id"] in ids, "Created agent should appear in list"

    @pytest.mark.asyncio
    async def test_list_filter_by_status(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        List should support filtering by status query parameter.
        """
        # Create online and offline agents
        await async_client.post(
            "/api/v1/agents",
            json={"name": "Online Agent", "status": "online"},
            headers=auth_headers,
        )
        await async_client.post(
            "/api/v1/agents",
            json={"name": "Offline Agent", "status": "offline"},
            headers=auth_headers,
        )

        response = await async_client.get(
            "/api/v1/agents?status=online", headers=auth_headers
        )
        body = response.json()
        for agent in body["data"]:
            assert agent["status"] == "online", (
                f"Filtered results should only contain online, got {agent['status']}"
            )

    @pytest.mark.asyncio
    async def test_list_filter_by_status_offline(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        Filtering by status=offline should only return offline agents.
        """
        await async_client.post(
            "/api/v1/agents",
            json={"name": "Agent Online", "status": "online"},
            headers=auth_headers,
        )
        await async_client.post(
            "/api/v1/agents",
            json={"name": "Agent Offline", "status": "offline"},
            headers=auth_headers,
        )

        response = await async_client.get(
            "/api/v1/agents?status=offline", headers=auth_headers
        )
        for agent in response.json()["data"]:
            assert agent["status"] == "offline"

    @pytest.mark.asyncio
    async def test_list_pagination_respects_per_page(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Pagination should respect the per_page parameter.
        """
        response = await async_client.get(
            "/api/v1/agents?page=1&per_page=2", headers=auth_headers
        )
        body = response.json()
        assert body["meta"]["per_page"] == 2
        assert len(body["data"]) <= 2


class TestGetAgent:
    """GET /api/v1/agents/{id}"""

    @pytest.mark.asyncio
    async def test_get_by_id_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_agent: dict
    ):
        """
        Happy path: get an Agent by ID returns 200 with full details.
        """
        agent_id = sample_agent["id"]
        response = await async_client.get(f"/api/v1/agents/{agent_id}", headers=auth_headers)

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        data = response.json()["data"]
        assert data["id"] == agent_id
        assert data["name"] == sample_agent["name"]
        assert data["status"] == sample_agent["status"]

    @pytest.mark.asyncio
    async def test_get_by_invalid_id_returns_404(self, async_client: AsyncClient, auth_headers: dict):
        """
        Getting a non-existent ID should return 404.
        """
        response = await async_client.get(
            "/api/v1/agents/00000000-0000-0000-0000-000000000000", headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_get_by_malformed_uuid_returns_422(self, async_client: AsyncClient, auth_headers: dict):
        """
        Getting with a malformed UUID should return 422.
        """
        response = await async_client.get(
            "/api/v1/agents/not-a-uuid", headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_requires_auth(self, async_client: AsyncClient, sample_agent: dict):
        """
        Getting an Agent without auth should return 401.
        """
        response = await async_client.get(f"/api/v1/agents/{sample_agent['id']}")
        assert response.status_code == 401


class TestUpdateAgent:
    """PUT /api/v1/agents/{id}"""

    @pytest.mark.asyncio
    async def test_update_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_agent: dict
    ):
        """
        Happy path: update an Agent returns 200 with updated fields.
        """
        agent_id = sample_agent["id"]
        update_payload = {"name": "Servidor Atualizado", "status": "offline"}

        response = await async_client.put(
            f"/api/v1/agents/{agent_id}", json=update_payload, headers=auth_headers
        )

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.json()}"
        )

        data = response.json()["data"]
        assert data["name"] == "Servidor Atualizado"
        assert data["status"] == "offline"
        assert data["id"] == agent_id

    @pytest.mark.asyncio
    async def test_update_partial_fields(
        self, async_client: AsyncClient, auth_headers: dict, sample_agent: dict
    ):
        """
        Updating only some fields should preserve existing values.
        """
        agent_id = sample_agent["id"]
        original_version = sample_agent.get("version")

        update_payload = {"name": "Only Name Changed"}

        response = await async_client.put(
            f"/api/v1/agents/{agent_id}", json=update_payload, headers=auth_headers
        )
        assert response.status_code == 200

        data = response.json()["data"]
        assert data["name"] == "Only Name Changed"
        # Version should not change
        assert data.get("version") == original_version

    @pytest.mark.asyncio
    async def test_update_nonexistent_returns_404(self, async_client: AsyncClient, auth_headers: dict):
        """
        Updating a non-existent Agent should return 404.
        """
        response = await async_client.put(
            "/api/v1/agents/00000000-0000-0000-0000-000000000000",
            json={"name": "Does Not Exist"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_requires_auth(self, async_client: AsyncClient, sample_agent: dict):
        """
        Updating an Agent without auth should return 401.
        """
        response = await async_client.put(
            f"/api/v1/agents/{sample_agent['id']}",
            json={"name": "No Auth"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_invalid_status_returns_422(
        self, async_client: AsyncClient, auth_headers: dict, sample_agent: dict
    ):
        """
        Updating with an invalid status should return 422.
        """
        response = await async_client.put(
            f"/api/v1/agents/{sample_agent['id']}",
            json={"status": "invalid_status"},
            headers=auth_headers,
        )
        assert response.status_code == 422


class TestDeleteAgent:
    """DELETE /api/v1/agents/{id}"""

    @pytest.mark.asyncio
    async def test_delete_returns_204(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        Happy path: delete an Agent returns 204 No Content.
        """
        create_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "To Be Deleted", "status": "offline"},
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        agent_id = create_resp.json()["data"]["id"]

        response = await async_client.delete(
            f"/api/v1/agents/{agent_id}", headers=auth_headers
        )
        assert response.status_code == 204, f"Expected 204, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_delete_nonexistent_returns_404(self, async_client: AsyncClient, auth_headers: dict):
        """
        Deleting a non-existent Agent should return 404.
        """
        response = await async_client.delete(
            "/api/v1/agents/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_deleted_agent_not_found_on_get(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        After deleting, GET should return 404.
        """
        create_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "Gone Soon", "status": "offline"},
            headers=auth_headers,
        )
        agent_id = create_resp.json()["data"]["id"]

        del_resp = await async_client.delete(f"/api/v1/agents/{agent_id}", headers=auth_headers)
        assert del_resp.status_code == 204

        get_resp = await async_client.get(f"/api/v1/agents/{agent_id}", headers=auth_headers)
        assert get_resp.status_code == 404, (
            f"Deleted agent should return 404, got {get_resp.status_code}"
        )

    @pytest.mark.asyncio
    async def test_delete_requires_auth(self, async_client: AsyncClient, sample_agent: dict):
        """
        Deleting an Agent without auth should return 401.
        """
        response = await async_client.delete(
            f"/api/v1/agents/{sample_agent['id']}"
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_agent_with_datasources_sets_null(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        Deleting an Agent with associated DataSources should succeed (SET NULL on agent_id).

        The agent_id FK has ON DELETE SET NULL, so datasources remain but lose the agent link.
        """
        # Create agent
        agent_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "Agent with DS", "status": "online"},
            headers=auth_headers,
        )
        agent_id = agent_resp.json()["data"]["id"]

        # Create datasource linked to this agent
        ds_resp = await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "DS Linked to Agent",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
                "agent_id": agent_id,
            },
            headers=auth_headers,
        )
        assert ds_resp.status_code == 201
        ds_id = ds_resp.json()["data"]["id"]

        # Delete the agent
        del_resp = await async_client.delete(f"/api/v1/agents/{agent_id}", headers=auth_headers)
        assert del_resp.status_code == 204

        # Datasource should still exist
        get_ds_resp = await async_client.get(f"/api/v1/datasources/{ds_id}", headers=auth_headers)
        assert get_ds_resp.status_code == 200
        ds_data = get_ds_resp.json()["data"]

        # agent_id should be null (SET NULL) or absent
        assert ds_data.get("agent_id") is None, (
            f"agent_id should be SET NULL after agent deletion, got {ds_data.get('agent_id')}"
        )


class TestAgentUserIsolation:
    """Verify that agents are scoped to their owning user."""

    @pytest.mark.asyncio
    async def test_user_cannot_see_other_users_agents(self, async_client: AsyncClient, test_db):
        """
        Agents created by user A should not appear in user B's list.
        """
        # Register user A
        reg_a = await async_client.post("/api/v1/auth/register", json={
            "email": "user-a@example.com",
            "password": "StrongPass123!",
            "name": "User A",
        })
        assert reg_a.status_code == 201
        token_a = reg_a.json()["data"]["access_token"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Register user B
        reg_b = await async_client.post("/api/v1/auth/register", json={
            "email": "user-b@example.com",
            "password": "StrongPass123!",
            "name": "User B",
        })
        assert reg_b.status_code == 201
        token_b = reg_b.json()["data"]["access_token"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # User A creates an agent
        create_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "A's Agent", "status": "online"},
            headers=headers_a,
        )
        assert create_resp.status_code == 201
        agent_id_a = create_resp.json()["data"]["id"]

        # User B creates an agent
        create_resp_b = await async_client.post(
            "/api/v1/agents",
            json={"name": "B's Agent", "status": "online"},
            headers=headers_b,
        )
        assert create_resp_b.status_code == 201
        agent_id_b = create_resp_b.json()["data"]["id"]

        # User A lists agents — should only see A's agent
        list_a = await async_client.get("/api/v1/agents", headers=headers_a)
        a_ids = [agent["id"] for agent in list_a.json()["data"]]
        assert agent_id_a in a_ids, "User A should see their own agent"
        assert agent_id_b not in a_ids, "User A should NOT see user B's agent"

        # User B lists agents — should only see B's agent
        list_b = await async_client.get("/api/v1/agents", headers=headers_b)
        b_ids = [agent["id"] for agent in list_b.json()["data"]]
        assert agent_id_b in b_ids, "User B should see their own agent"
        assert agent_id_a not in b_ids, "User B should NOT see user A's agent"

    @pytest.mark.asyncio
    async def test_user_cannot_get_other_users_agent(self, async_client: AsyncClient, test_db):
        """
        User B should get 404 when trying to GET user A's agent.
        """
        reg_a = await async_client.post("/api/v1/auth/register", json={
            "email": "user-get-a@example.com",
            "password": "StrongPass123!",
            "name": "User Get A",
        })
        token_a = reg_a.json()["data"]["access_token"]

        reg_b = await async_client.post("/api/v1/auth/register", json={
            "email": "user-get-b@example.com",
            "password": "StrongPass123!",
            "name": "User Get B",
        })
        token_b = reg_b.json()["data"]["access_token"]

        # User A creates agent
        create_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "Private Agent", "status": "online"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        agent_id = create_resp.json()["data"]["id"]

        # User B tries to GET user A's agent
        response = await async_client.get(
            f"/api/v1/agents/{agent_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert response.status_code == 404, (
            f"User B should get 404 for user A's agent, got {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_user_cannot_update_other_users_agent(self, async_client: AsyncClient, test_db):
        """
        User B should get 404 when trying to PUT user A's agent.
        """
        reg_a = await async_client.post("/api/v1/auth/register", json={
            "email": "user-put-a@example.com",
            "password": "StrongPass123!",
            "name": "User Put A",
        })
        token_a = reg_a.json()["data"]["access_token"]

        reg_b = await async_client.post("/api/v1/auth/register", json={
            "email": "user-put-b@example.com",
            "password": "StrongPass123!",
            "name": "User Put B",
        })
        token_b = reg_b.json()["data"]["access_token"]

        create_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "Update Target", "status": "online"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        agent_id = create_resp.json()["data"]["id"]

        response = await async_client.put(
            f"/api/v1/agents/{agent_id}",
            json={"name": "Hacked"},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_user_cannot_delete_other_users_agent(self, async_client: AsyncClient, test_db):
        """
        User B should get 404 when trying to DELETE user A's agent.
        """
        reg_a = await async_client.post("/api/v1/auth/register", json={
            "email": "user-del-a@example.com",
            "password": "StrongPass123!",
            "name": "User Del A",
        })
        token_a = reg_a.json()["data"]["access_token"]

        reg_b = await async_client.post("/api/v1/auth/register", json={
            "email": "user-del-b@example.com",
            "password": "StrongPass123!",
            "name": "User Del B",
        })
        token_b = reg_b.json()["data"]["access_token"]

        create_resp = await async_client.post(
            "/api/v1/agents",
            json={"name": "Delete Target", "status": "online"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        agent_id = create_resp.json()["data"]["id"]

        response = await async_client.delete(
            f"/api/v1/agents/{agent_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert response.status_code == 404
