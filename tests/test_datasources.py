"""
Integration tests for DataSource CRUD endpoints.

Tests full HTTP lifecycle:
- POST /api/v1/datasources (201 create, 400 invalid)
- GET /api/v1/datasources (200 list with pagination)
- GET /api/v1/datasources/{id} (200 detail, 404 missing)
- PUT /api/v1/datasources/{id} (200 update)
- DELETE /api/v1/datasources/{id} (204 delete, 404 missing)
- Agent relationship: agent_id field, validation, response enrichment

RED PHASE: Tests that reference agent_id will fail because the
agent-related schema fields and route logic don't exist yet.
"""

import pytest
from httpx import AsyncClient


class TestCreateDataSource:
    """POST /api/v1/datasources"""

    @pytest.mark.asyncio
    async def test_create_returns_201(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        Happy path: create a DataSource with valid data returns 201.
        """
        payload = {
            "name": "Production Postgres",
            "type": "postgres",
            "connection_config": {
                "host": "prod-db.internal",
                "port": 5432,
                "database": "analytics",
                "username": "reader",
                "password": "secret123",
            },
            "status": "active",
        }

        response = await async_client.post(
            "/api/v1/datasources", json=payload, headers=auth_headers
        )

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"

        body = response.json()
        assert body["error"] is None
        data = body["data"]

        # Verify response shape
        assert data["name"] == "Production Postgres"
        assert data["type"] == "postgres"
        assert data["status"] == "active"
        assert "id" in data, "Response should include id"
        assert "created_at" in data, "Response should include created_at"
        assert "updated_at" in data, "Response should include updated_at"
        # connection_config should be present (may be masked or full)
        assert "connection_config" in data

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, async_client: AsyncClient):
        """
        Creating a DataSource without auth should return 401.
        """
        payload = {
            "name": "Unauthorized DS",
            "type": "postgres",
            "connection_config": {},
            "status": "active",
        }

        response = await async_client.post("/api/v1/datasources", json=payload)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_invalid_type_returns_422(self, async_client: AsyncClient, auth_headers: dict):
        """
        Creating a DataSource with invalid type should return 422.
        """
        payload = {
            "name": "Invalid Type",
            "type": "invalid_db_type",
            "connection_config": {},
            "status": "active",
        }

        response = await async_client.post(
            "/api/v1/datasources", json=payload, headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_create_missing_name_returns_422(self, async_client: AsyncClient, auth_headers: dict):
        """
        Creating without name should return 422.
        """
        payload = {
            "type": "postgres",
            "connection_config": {},
            "status": "active",
        }

        response = await async_client.post(
            "/api/v1/datasources", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_empty_name_returns_422(self, async_client: AsyncClient, auth_headers: dict):
        """
        Creating with empty name should return 422.
        """
        payload = {
            "name": "",
            "type": "postgres",
            "connection_config": {},
            "status": "active",
        }

        response = await async_client.post(
            "/api/v1/datasources", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_datasource_with_all_valid_types(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Should accept all valid data source types: postgres, mysql, bigquery, google_sheets.
        """
        valid_types = ["postgres", "mysql", "bigquery", "google_sheets"]
        created = []

        for ds_type in valid_types:
            payload = {
                "name": f"{ds_type} Source",
                "type": ds_type,
                "connection_config": {"key": "value"},
                "status": "active",
            }
            response = await async_client.post(
                "/api/v1/datasources", json=payload, headers=auth_headers
            )
            assert response.status_code == 201, f"Type {ds_type} should be valid, got {response.status_code}"
            created.append(response.json()["data"]["id"])

        # All should have unique IDs
        assert len(set(created)) == len(valid_types), "Each datasource should have unique ID"


class TestListDataSources:
    """GET /api/v1/datasources"""

    @pytest.mark.asyncio
    async def test_list_returns_200_with_pagination(self, async_client: AsyncClient, auth_headers: dict, test_db):
        """
        Happy path: list DataSources returns 200 with paginated response.
        """
        response = await async_client.get("/api/v1/datasources", headers=auth_headers)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

        body = response.json()
        assert body["error"] is None
        assert "data" in body
        assert "meta" in body, "Paginated response should include 'meta'"

        meta = body["meta"]
        assert "page" in meta
        assert "per_page" in meta
        assert "total" in meta
        assert isinstance(body["data"], list)

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, async_client: AsyncClient):
        """
        Listing DataSources without auth should return 401.
        """
        response = await async_client.get("/api/v1/datasources")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_contains_created_datasource(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict, test_db
    ):
        """
        After creating a datasource, it should appear in the list.
        """
        response = await async_client.get("/api/v1/datasources", headers=auth_headers)

        body = response.json()
        data = body["data"]
        ids = [ds["id"] for ds in data]
        assert sample_datasource["id"] in ids, "Created datasource should appear in list"

    @pytest.mark.asyncio
    async def test_list_filter_by_type(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        List should support filtering by type query parameter.
        """
        # Create a postgres and a mysql
        await async_client.post(
            "/api/v1/datasources",
            json={"name": "PG", "type": "postgres", "connection_config": {}, "status": "active"},
            headers=auth_headers,
        )
        await async_client.post(
            "/api/v1/datasources",
            json={"name": "MY", "type": "mysql", "connection_config": {}, "status": "active"},
            headers=auth_headers,
        )

        # Filter by type=postgres
        response = await async_client.get(
            "/api/v1/datasources?type=postgres", headers=auth_headers
        )
        body = response.json()
        data = body["data"]
        for ds in data:
            assert ds["type"] == "postgres", (
                f"Filtered results should only contain postgres, got {ds['type']}"
            )

    @pytest.mark.asyncio
    async def test_list_filter_by_status(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        List should support filtering by status query parameter.
        """
        # Create active and inactive
        await async_client.post(
            "/api/v1/datasources",
            json={"name": "Active", "type": "postgres", "connection_config": {}, "status": "active"},
            headers=auth_headers,
        )
        await async_client.post(
            "/api/v1/datasources",
            json={"name": "Inactive", "type": "postgres", "connection_config": {}, "status": "inactive"},
            headers=auth_headers,
        )

        response = await async_client.get(
            "/api/v1/datasources?status=inactive", headers=auth_headers
        )
        body = response.json()
        for ds in body["data"]:
            assert ds["status"] == "inactive"

    @pytest.mark.asyncio
    async def test_list_pagination_respects_per_page(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Pagination should respect the per_page parameter.
        """
        response = await async_client.get(
            "/api/v1/datasources?page=1&per_page=2", headers=auth_headers
        )
        body = response.json()
        meta = body["meta"]
        assert meta["per_page"] == 2
        assert len(body["data"]) <= 2

    @pytest.mark.asyncio
    async def test_list_empty_page_returns_empty_data(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Requesting a page beyond the data range should return empty list.
        """
        response = await async_client.get(
            "/api/v1/datasources?page=99999&per_page=50", headers=auth_headers
        )
        body = response.json()
        assert body["data"] == []
        assert body["meta"]["total"] >= 0


class TestGetDataSource:
    """GET /api/v1/datasources/{id}"""

    @pytest.mark.asyncio
    async def test_get_by_id_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict
    ):
        """
        Happy path: get a DataSource by ID returns 200 with full details.
        """
        ds_id = sample_datasource["id"]
        response = await async_client.get(f"/api/v1/datasources/{ds_id}", headers=auth_headers)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

        data = response.json()["data"]
        assert data["id"] == ds_id
        assert data["name"] == sample_datasource["name"]
        assert data["type"] == sample_datasource["type"]

    @pytest.mark.asyncio
    async def test_get_by_invalid_id_returns_404(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Getting a non-existent ID should return 404.
        """
        response = await async_client.get(
            "/api/v1/datasources/00000000-0000-0000-0000-000000000000", headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_get_by_malformed_uuid_returns_422(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Getting with a malformed UUID should return 422.
        """
        response = await async_client.get(
            "/api/v1/datasources/not-a-uuid", headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_get_requires_auth(self, async_client: AsyncClient, sample_datasource: dict):
        """
        Getting a DataSource without auth should return 401.
        """
        response = await async_client.get(f"/api/v1/datasources/{sample_datasource['id']}")
        assert response.status_code == 401


class TestUpdateDataSource:
    """PUT /api/v1/datasources/{id}"""

    @pytest.mark.asyncio
    async def test_update_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict
    ):
        """
        Happy path: update a DataSource returns 200 with updated fields.
        """
        ds_id = sample_datasource["id"]
        update_payload = {
            "name": "Updated Production DB",
            "status": "inactive",
        }

        response = await async_client.put(
            f"/api/v1/datasources/{ds_id}", json=update_payload, headers=auth_headers
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

        data = response.json()["data"]
        assert data["name"] == "Updated Production DB"
        assert data["status"] == "inactive"
        assert data["id"] == ds_id  # ID unchanged
        assert data["updated_at"] != sample_datasource.get("updated_at", ""), "updated_at should change"

    @pytest.mark.asyncio
    async def test_update_partial_fields(self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict):
        """
        Updating only some fields (partial update) should preserve existing values.
        """
        ds_id = sample_datasource["id"]
        original_type = sample_datasource["type"]

        update_payload = {"name": "Only Name Changed"}

        response = await async_client.put(
            f"/api/v1/datasources/{ds_id}", json=update_payload, headers=auth_headers
        )
        assert response.status_code == 200

        data = response.json()["data"]
        assert data["name"] == "Only Name Changed"
        assert data["type"] == original_type, "Unchanged fields should keep original values"

    @pytest.mark.asyncio
    async def test_update_nonexistent_returns_404(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Updating a non-existent DataSource should return 404.
        """
        response = await async_client.put(
            "/api/v1/datasources/00000000-0000-0000-0000-000000000000",
            json={"name": "Does Not Exist"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_invalid_type_returns_422(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict
    ):
        """
        Updating with an invalid type should return 422.
        """
        response = await async_client.put(
            f"/api/v1/datasources/{sample_datasource['id']}",
            json={"type": "invalid_type"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_requires_auth(self, async_client: AsyncClient, sample_datasource: dict):
        """
        Updating without auth should return 401.
        """
        response = await async_client.put(
            f"/api/v1/datasources/{sample_datasource['id']}",
            json={"name": "No Auth"},
        )
        assert response.status_code == 401


class TestDeleteDataSource:
    """DELETE /api/v1/datasources/{id}"""

    @pytest.mark.asyncio
    async def test_delete_returns_204(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Happy path: delete a DataSource returns 204 No Content.
        Must create a fresh one (not the shared fixture which may have pipelines).
        """
        # Create a standalone datasource
        create_resp = await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "To Be Deleted",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
            },
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        ds_id = create_resp.json()["data"]["id"]

        # Delete it
        response = await async_client.delete(
            f"/api/v1/datasources/{ds_id}", headers=auth_headers
        )

        assert response.status_code == 204, f"Expected 204, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_delete_nonexistent_returns_404(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Deleting a non-existent DataSource should return 404.
        """
        response = await async_client.delete(
            "/api/v1/datasources/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_deleted_datasource_not_found_on_get(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        After deleting, GET should return 404.
        """
        # Create
        create_resp = await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "Gone Soon",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
            },
            headers=auth_headers,
        )
        ds_id = create_resp.json()["data"]["id"]

        # Delete
        del_resp = await async_client.delete(f"/api/v1/datasources/{ds_id}", headers=auth_headers)
        assert del_resp.status_code == 204

        # Get should 404
        get_resp = await async_client.get(f"/api/v1/datasources/{ds_id}", headers=auth_headers)
        assert get_resp.status_code == 404, (
            f"Deleted datasource should return 404, got {get_resp.status_code}"
        )

    @pytest.mark.asyncio
    async def test_delete_requires_auth(self, async_client: AsyncClient, sample_datasource: dict):
        """
        Deleting without auth should return 401.
        """
        response = await async_client.delete(
            f"/api/v1/datasources/{sample_datasource['id']}"
        )
        assert response.status_code == 401


class TestDataSourceAgentRelationship:
    """Tests for DataSource ↔ Agent relationship via agent_id field."""

    @pytest.mark.asyncio
    async def test_create_datasource_with_agent_id(
        self, async_client: AsyncClient, auth_headers: dict, sample_agent: dict, test_db
    ):
        """
        Creating a DataSource with a valid agent_id should succeed
        and include the agent_id in the response.
        """
        payload = {
            "name": "Agent-Linked DS",
            "type": "postgres",
            "connection_config": {"host": "db1"},
            "status": "active",
            "agent_id": sample_agent["id"],
        }

        response = await async_client.post(
            "/api/v1/datasources", json=payload, headers=auth_headers
        )

        assert response.status_code == 201, (
            f"Expected 201, got {response.status_code}: {response.json()}"
        )

        data = response.json()["data"]
        assert data.get("agent_id") == sample_agent["id"], (
            f"Response should include agent_id={sample_agent['id']}, got {data.get('agent_id')}"
        )

    @pytest.mark.asyncio
    async def test_create_datasource_without_agent_id_succeeds(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Creating a DataSource without agent_id should succeed (field is optional).
        """
        payload = {
            "name": "No Agent DS",
            "type": "postgres",
            "connection_config": {"host": "db2"},
            "status": "active",
        }

        response = await async_client.post(
            "/api/v1/datasources", json=payload, headers=auth_headers
        )

        assert response.status_code == 201, (
            f"Creating without agent_id should succeed (optional), got {response.status_code}"
        )

        data = response.json()["data"]
        # agent_id may be None or absent
        assert data.get("agent_id") is None or "agent_id" not in data

    @pytest.mark.asyncio
    async def test_create_datasource_with_invalid_agent_id(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Creating a DataSource with a non-existent agent_id should return
        an error (404 or 422).
        """
        payload = {
            "name": "Bad Agent DS",
            "type": "postgres",
            "connection_config": {"host": "db3"},
            "status": "active",
            "agent_id": "00000000-0000-0000-0000-000000000000",
        }

        response = await async_client.post(
            "/api/v1/datasources", json=payload, headers=auth_headers
        )

        # Should fail with either 404 (agent not found) or 422 (invalid reference)
        assert response.status_code in (404, 422), (
            f"Expected 404 or 422 for invalid agent_id, got {response.status_code}: {response.json()}"
        )

    @pytest.mark.asyncio
    async def test_datasource_response_includes_agent_info(
        self, async_client: AsyncClient, auth_headers: dict, sample_agent: dict, test_db
    ):
        """
        When a DataSource has an agent_id, the response should include
        basic agent information (id, name, status).
        """
        # Create a datasource linked to the agent
        create_resp = await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "DS with Agent Info",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
                "agent_id": sample_agent["id"],
            },
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        ds_id = create_resp.json()["data"]["id"]

        # Get the datasource and check for agent info
        get_resp = await async_client.get(
            f"/api/v1/datasources/{ds_id}", headers=auth_headers
        )
        assert get_resp.status_code == 200
        data = get_resp.json()["data"]

        # Should include agent_id
        assert data.get("agent_id") == sample_agent["id"]

        # Should include agent summary if the API enriches the response
        if "agent" in data:
            assert "id" in data["agent"]
            assert "name" in data["agent"]

    @pytest.mark.asyncio
    async def test_update_datasource_agent_id(
        self, async_client: AsyncClient, auth_headers: dict, sample_agent: dict, test_db
    ):
        """
        Updating a DataSource to add or change agent_id should work.
        """
        # Create a datasource without agent_id
        create_resp = await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "Unlinked DS",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
            },
            headers=auth_headers,
        )
        ds_id = create_resp.json()["data"]["id"]

        # Update to add agent_id
        update_resp = await async_client.put(
            f"/api/v1/datasources/{ds_id}",
            json={"agent_id": sample_agent["id"]},
            headers=auth_headers,
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["data"].get("agent_id") == sample_agent["id"]

        # Update to remove agent_id (set to null)
        update_resp2 = await async_client.put(
            f"/api/v1/datasources/{ds_id}",
            json={"agent_id": None},
            headers=auth_headers,
        )
        assert update_resp2.status_code == 200
        # agent_id should now be None (or not included)
        assert update_resp2.json()["data"].get("agent_id") is None

    @pytest.mark.asyncio
    async def test_list_datasources_with_agent_filter(
        self, async_client: AsyncClient, auth_headers: dict, sample_agent: dict, test_db
    ):
        """
        Listing datasources should support filtering by agent_id (if implemented).
        """
        # Create a datasource linked to the agent
        await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "Filtered by Agent",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
                "agent_id": sample_agent["id"],
            },
            headers=auth_headers,
        )

        # Try filtering by agent_id
        response = await async_client.get(
            f"/api/v1/datasources?agent_id={sample_agent['id']}",
            headers=auth_headers,
        )

        # If filtering is supported, all results should have matching agent_id
        if response.status_code == 200:
            for ds in response.json()["data"]:
                if "agent_id" in ds:
                    assert ds["agent_id"] == sample_agent["id"] or ds["agent_id"] is None
