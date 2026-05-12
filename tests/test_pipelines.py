"""
Integration tests for Pipeline CRUD endpoints.

Tests full HTTP lifecycle:
- POST /api/v1/pipelines (201 create, 400 invalid data_source_id, 422 invalid)
- GET /api/v1/pipelines (200 list with filters)
- GET /api/v1/pipelines/{id} (200 detail with nested data_source, 404 missing)
- PUT /api/v1/pipelines/{id} (200 update)
- DELETE /api/v1/pipelines/{id} (204 delete)

RED PHASE: All tests WILL FAIL because routes don't exist yet.
"""

import pytest
from httpx import AsyncClient


class TestCreatePipeline:
    """POST /api/v1/pipelines"""

    @pytest.mark.asyncio
    async def test_create_returns_201(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict, test_db
    ):
        """
        Happy path: create a Pipeline with valid data returns 201.
        """
        payload = {
            "name": "Daily Row Count",
            "type": "volume",
            "data_source_id": sample_datasource["id"],
            "schedule": "0 6 * * *",
            "config": {
                "query": "SELECT COUNT(*) FROM users",
                "threshold": 10000,
                "min_expected": 500,
            },
            "enabled": True,
        }

        response = await async_client.post(
            "/api/v1/pipelines", json=payload, headers=auth_headers
        )

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"

        body = response.json()
        assert body["error"] is None
        data = body["data"]

        assert data["name"] == "Daily Row Count"
        assert data["type"] == "volume"
        assert data["data_source_id"] == sample_datasource["id"]
        assert data["schedule"] == "0 6 * * *"
        assert data["enabled"] is True
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        assert "config" in data

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, async_client: AsyncClient, sample_datasource: dict):
        """
        Creating a Pipeline without auth should return 401.
        """
        payload = {
            "name": "Unauthorized Pipeline",
            "type": "volume",
            "data_source_id": sample_datasource["id"],
            "schedule": "0 * * * *",
            "config": {},
            "enabled": True,
        }

        response = await async_client.post("/api/v1/pipelines", json=payload)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_nonexistent_datasource_returns_400(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Creating a Pipeline with a non-existent data_source_id should return 400.
        """
        payload = {
            "name": "Bad FK Pipeline",
            "type": "volume",
            "data_source_id": "00000000-0000-0000-0000-000000000000",
            "schedule": "0 * * * *",
            "config": {},
            "enabled": True,
        }

        response = await async_client.post(
            "/api/v1/pipelines", json=payload, headers=auth_headers
        )
        assert response.status_code == 400, (
            f"Expected 400 for invalid data_source_id, got {response.status_code}"
        )
        body = response.json()
        assert body["error"] is not None

    @pytest.mark.asyncio
    async def test_create_invalid_type_returns_422(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict
    ):
        """
        Creating with an invalid pipeline type should return 422.
        """
        payload = {
            "name": "Invalid Type",
            "type": "invalid_pipeline_type",
            "data_source_id": sample_datasource["id"],
            "schedule": "0 * * * *",
            "config": {},
            "enabled": True,
        }

        response = await async_client.post(
            "/api/v1/pipelines", json=payload, headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_create_missing_name_returns_422(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict
    ):
        """
        Creating without name should return 422.
        """
        payload = {
            "type": "volume",
            "data_source_id": sample_datasource["id"],
            "schedule": "0 * * * *",
            "config": {},
            "enabled": True,
        }

        response = await async_client.post(
            "/api/v1/pipelines", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_missing_data_source_id_returns_422(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Creating without data_source_id should return 422.
        """
        payload = {
            "name": "No DS",
            "type": "volume",
            "schedule": "0 * * * *",
            "config": {},
            "enabled": True,
        }

        response = await async_client.post(
            "/api/v1/pipelines", json=payload, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_all_valid_types(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict, test_db
    ):
        """
        Should accept all valid pipeline types: volume, null_check, schema_change.
        """
        valid_types = ["volume", "null_check", "schema_change"]

        for pipe_type in valid_types:
            payload = {
                "name": f"{pipe_type} Pipeline",
                "type": pipe_type,
                "data_source_id": sample_datasource["id"],
                "schedule": "0 * * * *",
                "config": {},
                "enabled": True,
            }
            response = await async_client.post(
                "/api/v1/pipelines", json=payload, headers=auth_headers
            )
            assert response.status_code == 201, f"Type {pipe_type} should be valid, got {response.status_code}"


class TestListPipelines:
    """GET /api/v1/pipelines"""

    @pytest.mark.asyncio
    async def test_list_returns_200_with_pagination(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Happy path: list Pipelines returns 200 with paginated response.
        """
        response = await async_client.get("/api/v1/pipelines", headers=auth_headers)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        body = response.json()
        assert body["error"] is None
        assert isinstance(body["data"], list)
        assert "meta" in body
        meta = body["meta"]
        assert "page" in meta
        assert "per_page" in meta
        assert "total" in meta

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, async_client: AsyncClient):
        """
        Listing Pipelines without auth should return 401.
        """
        response = await async_client.get("/api/v1/pipelines")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_contains_created_pipeline(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict, test_db
    ):
        """
        After creating a pipeline, it should appear in the list.
        """
        response = await async_client.get("/api/v1/pipelines", headers=auth_headers)

        body = response.json()
        ids = [p["id"] for p in body["data"]]
        assert sample_pipeline["id"] in ids, "Created pipeline should appear in list"

    @pytest.mark.asyncio
    async def test_list_filter_by_type(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict, test_db
    ):
        """
        List should support filtering by type query parameter.
        """
        await async_client.post(
            "/api/v1/pipelines",
            json={
                "name": "Volume Pipe",
                "type": "volume",
                "data_source_id": sample_datasource["id"],
                "schedule": "0 * * * *",
                "config": {},
                "enabled": True,
            },
            headers=auth_headers,
        )
        await async_client.post(
            "/api/v1/pipelines",
            json={
                "name": "Null Pipe",
                "type": "null_check",
                "data_source_id": sample_datasource["id"],
                "schedule": "0 * * * *",
                "config": {},
                "enabled": True,
            },
            headers=auth_headers,
        )

        response = await async_client.get(
            "/api/v1/pipelines?type=volume", headers=auth_headers
        )
        body = response.json()
        for pipe in body["data"]:
            assert pipe["type"] == "volume", (
                f"Filtered results should only contain volume, got {pipe['type']}"
            )

    @pytest.mark.asyncio
    async def test_list_filter_by_data_source_id(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict, sample_pipeline: dict, test_db
    ):
        """
        List should support filtering by data_source_id query parameter.
        """
        response = await async_client.get(
            f"/api/v1/pipelines?data_source_id={sample_datasource['id']}",
            headers=auth_headers,
        )
        body = response.json()
        for pipe in body["data"]:
            assert pipe["data_source_id"] == sample_datasource["id"]

    @pytest.mark.asyncio
    async def test_list_filter_by_enabled(
        self, async_client: AsyncClient, auth_headers: dict, sample_datasource: dict, test_db
    ):
        """
        List should support filtering by enabled query parameter.
        """
        await async_client.post(
            "/api/v1/pipelines",
            json={
                "name": "Enabled Pipe",
                "type": "volume",
                "data_source_id": sample_datasource["id"],
                "schedule": "0 * * * *",
                "config": {},
                "enabled": True,
            },
            headers=auth_headers,
        )
        await async_client.post(
            "/api/v1/pipelines",
            json={
                "name": "Disabled Pipe",
                "type": "volume",
                "data_source_id": sample_datasource["id"],
                "schedule": "0 * * * *",
                "config": {},
                "enabled": False,
            },
            headers=auth_headers,
        )

        response = await async_client.get(
            "/api/v1/pipelines?enabled=false", headers=auth_headers
        )
        body = response.json()
        for pipe in body["data"]:
            assert pipe["enabled"] is False

    @pytest.mark.asyncio
    async def test_list_pagination(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Pagination should respect page and per_page parameters.
        """
        response = await async_client.get(
            "/api/v1/pipelines?page=1&per_page=3", headers=auth_headers
        )
        body = response.json()
        assert body["meta"]["per_page"] == 3
        assert len(body["data"]) <= 3


class TestGetPipeline:
    """GET /api/v1/pipelines/{id}"""

    @pytest.mark.asyncio
    async def test_get_by_id_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict
    ):
        """
        Happy path: get a Pipeline by ID returns 200 with full details.
        """
        pipe_id = sample_pipeline["id"]
        response = await async_client.get(f"/api/v1/pipelines/{pipe_id}", headers=auth_headers)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

        data = response.json()["data"]
        assert data["id"] == pipe_id
        assert data["name"] == sample_pipeline["name"]

    @pytest.mark.asyncio
    async def test_get_includes_nested_data_source(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict, sample_datasource: dict
    ):
        """
        Pipeline detail should include nested data_source information.
        """
        pipe_id = sample_pipeline["id"]
        response = await async_client.get(f"/api/v1/pipelines/{pipe_id}", headers=auth_headers)

        data = response.json()["data"]
        assert "data_source" in data, "Pipeline detail should include nested 'data_source'"
        ds = data["data_source"]
        assert "id" in ds
        assert "name" in ds
        assert ds["id"] == sample_datasource["id"]

    @pytest.mark.asyncio
    async def test_get_nonexistent_returns_404(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Getting a non-existent Pipeline should return 404.
        """
        response = await async_client.get(
            "/api/v1/pipelines/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_malformed_id_returns_422(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Getting with malformed UUID should return 422.
        """
        response = await async_client.get("/api/v1/pipelines/not-a-uuid", headers=auth_headers)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_requires_auth(self, async_client: AsyncClient, sample_pipeline: dict):
        """
        Getting a Pipeline without auth should return 401.
        """
        response = await async_client.get(f"/api/v1/pipelines/{sample_pipeline['id']}")
        assert response.status_code == 401


class TestUpdatePipeline:
    """PUT /api/v1/pipelines/{id}"""

    @pytest.mark.asyncio
    async def test_update_returns_200(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict
    ):
        """
        Happy path: update a Pipeline returns 200 with updated fields.
        """
        pipe_id = sample_pipeline["id"]
        update_payload = {
            "name": "Updated Pipeline Name",
            "enabled": False,
        }

        response = await async_client.put(
            f"/api/v1/pipelines/{pipe_id}", json=update_payload, headers=auth_headers
        )

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

        data = response.json()["data"]
        assert data["name"] == "Updated Pipeline Name"
        assert data["enabled"] is False
        assert data["id"] == pipe_id
        assert data["updated_at"] != sample_pipeline.get("updated_at", ""), "updated_at should change"

    @pytest.mark.asyncio
    async def test_update_partial_preserves_fields(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict
    ):
        """
        Partial update should preserve unchanged fields.
        """
        pipe_id = sample_pipeline["id"]
        original_type = sample_pipeline["type"]

        response = await async_client.put(
            f"/api/v1/pipelines/{pipe_id}",
            json={"name": "Only Name Update"},
            headers=auth_headers,
        )
        data = response.json()["data"]
        assert data["name"] == "Only Name Update"
        assert data["type"] == original_type, "Unchanged type should be preserved"

    @pytest.mark.asyncio
    async def test_update_nonexistent_returns_404(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Updating a non-existent Pipeline should return 404.
        """
        response = await async_client.put(
            "/api/v1/pipelines/00000000-0000-0000-0000-000000000000",
            json={"name": "Nope"},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_invalid_type_returns_422(
        self, async_client: AsyncClient, auth_headers: dict, sample_pipeline: dict
    ):
        """
        Updating with invalid type should return 422.
        """
        response = await async_client.put(
            f"/api/v1/pipelines/{sample_pipeline['id']}",
            json={"type": "invalid"},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_requires_auth(self, async_client: AsyncClient, sample_pipeline: dict):
        """
        Updating without auth should return 401.
        """
        response = await async_client.put(
            f"/api/v1/pipelines/{sample_pipeline['id']}",
            json={"name": "No Auth"},
        )
        assert response.status_code == 401


class TestDeletePipeline:
    """DELETE /api/v1/pipelines/{id}"""

    @pytest.mark.asyncio
    async def test_delete_returns_204(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Happy path: delete a Pipeline returns 204 No Content.
        Must create a standalone pipeline for this test.
        """
        # First create a datasource for the pipeline
        ds_resp = await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "Delete Pipe DS",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
            },
            headers=auth_headers,
        )
        ds_id = ds_resp.json()["data"]["id"]

        # Create pipeline
        pipe_resp = await async_client.post(
            "/api/v1/pipelines",
            json={
                "name": "To Delete",
                "type": "volume",
                "data_source_id": ds_id,
                "schedule": "0 * * * *",
                "config": {},
                "enabled": True,
            },
            headers=auth_headers,
        )
        pipe_id = pipe_resp.json()["data"]["id"]

        # Delete it
        response = await async_client.delete(
            f"/api/v1/pipelines/{pipe_id}", headers=auth_headers
        )
        assert response.status_code == 204, f"Expected 204, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_delete_nonexistent_returns_404(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Deleting a non-existent Pipeline should return 404.
        """
        response = await async_client.delete(
            "/api/v1/pipelines/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_deleted_pipeline_not_found_on_get(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        After deleting, GET should return 404.
        """
        # Create DS
        ds_resp = await async_client.post(
            "/api/v1/datasources",
            json={
                "name": "Gone Pipe DS",
                "type": "postgres",
                "connection_config": {},
                "status": "active",
            },
            headers=auth_headers,
        )
        ds_id = ds_resp.json()["data"]["id"]

        # Create pipeline
        pipe_resp = await async_client.post(
            "/api/v1/pipelines",
            json={
                "name": "Gone Soon",
                "type": "volume",
                "data_source_id": ds_id,
                "schedule": "0 * * * *",
                "config": {},
                "enabled": True,
            },
            headers=auth_headers,
        )
        pipe_id = pipe_resp.json()["data"]["id"]

        # Delete
        await async_client.delete(f"/api/v1/pipelines/{pipe_id}", headers=auth_headers)

        # Get should 404
        get_resp = await async_client.get(f"/api/v1/pipelines/{pipe_id}", headers=auth_headers)
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_requires_auth(self, async_client: AsyncClient, sample_pipeline: dict):
        """
        Deleting without auth should return 401.
        """
        response = await async_client.delete(f"/api/v1/pipelines/{sample_pipeline['id']}")
        assert response.status_code == 401
