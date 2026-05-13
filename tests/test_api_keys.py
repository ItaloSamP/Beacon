"""
Integration tests for API Key management endpoints.

Tests:
- POST /api/v1/api-keys (201 create + key returned once, 401 without JWT)
- GET /api/v1/api-keys (200 list)
- DELETE /api/v1/api-keys/{id} (204 revoke)
- Authentication with API Key header

RED PHASE: All tests WILL FAIL because routes don't exist yet.
"""

import pytest
from httpx import AsyncClient


class TestCreateApiKey:
    """POST /api/v1/api-keys"""

    @pytest.mark.asyncio
    async def test_create_returns_201_with_key(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Happy path: create an API key returns 201 with the full key value.
        The key is only returned at creation time.
        """
        payload = {
            "name": "My Connector",
            "expires_at": "2027-05-12T00:00:00Z",
        }

        response = await async_client.post(
            "/api/v1/api-keys", json=payload, headers=auth_headers
        )

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"

        body = response.json()
        assert body["error"] is None
        data = body["data"]

        assert "id" in data
        assert data["name"] == "My Connector"
        assert "prefix" in data, "API key response should include prefix"
        assert data["prefix"] == "bcn_", f"Expected prefix 'bcn_', got '{data.get('prefix')}'"
        assert "key" in data, "API key response should include the full key (only on creation)"
        assert data["key"].startswith("bcn_"), f"Key should start with 'bcn_', got '{data.get('key')}'"
        assert len(data["key"]) > 10, "API key should be reasonably long"
        assert "created_at" in data
        # expires_at may be null or a date string
        if "expires_at" in data and data["expires_at"] is not None:
            assert "T" in data["expires_at"], "expires_at should be ISO format"

    @pytest.mark.asyncio
    async def test_create_minimal_fields(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Create with only name (expires_at is optional).
        """
        payload = {"name": "Simple Key"}

        response = await async_client.post(
            "/api/v1/api-keys", json=payload, headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()["data"]
        assert data["name"] == "Simple Key"
        assert "key" in data

    @pytest.mark.asyncio
    async def test_create_requires_jwt_auth(self, async_client: AsyncClient):
        """
        Creating an API key without JWT should return 401.
        """
        payload = {"name": "Unauthorized Key"}

        response = await async_client.post("/api/v1/api-keys", json=payload)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_missing_name_returns_422(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Creating without name should return 422.
        """
        response = await async_client.post(
            "/api/v1/api-keys", json={}, headers=auth_headers
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_empty_name_returns_422(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Creating with empty name should return 422.
        """
        response = await async_client.post(
            "/api/v1/api-keys", json={"name": ""}, headers=auth_headers
        )
        assert response.status_code == 422


class TestListApiKeys:
    """GET /api/v1/api-keys"""

    @pytest.mark.asyncio
    async def test_list_returns_200_with_array(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Happy path: list API keys returns 200 with array of keys.
        Note: listing should NOT expose the full key value, only prefix.
        """
        # Create one key first
        await async_client.post(
            "/api/v1/api-keys",
            json={"name": "List Test Key"},
            headers=auth_headers,
        )

        response = await async_client.get("/api/v1/api-keys", headers=auth_headers)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        body = response.json()
        assert body["error"] is None
        assert isinstance(body["data"], list)

        if len(body["data"]) > 0:
            key_data = body["data"][0]
            assert "id" in key_data
            assert "name" in key_data
            assert "prefix" in key_data
            # The full key should NOT be in the list response
            assert "key" not in key_data, "List response should NOT expose the full key value"
            assert "revoked" in key_data
            assert "created_at" in key_data

    @pytest.mark.asyncio
    async def test_list_requires_jwt_auth(self, async_client: AsyncClient):
        """
        Listing API keys without JWT should return 401.
        """
        response = await async_client.get("/api/v1/api-keys")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_includes_created_key(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Created key should appear in the list.
        """
        create_resp = await async_client.post(
            "/api/v1/api-keys",
            json={"name": "Findable Key"},
            headers=auth_headers,
        )
        created_id = create_resp.json()["data"]["id"]

        list_resp = await async_client.get("/api/v1/api-keys", headers=auth_headers)
        ids = [k["id"] for k in list_resp.json()["data"]]
        assert created_id in ids, "Created key should be in list"

    @pytest.mark.asyncio
    async def test_list_does_not_expose_full_keys(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Security: listing API keys must NEVER expose the full key value.
        """
        await async_client.post(
            "/api/v1/api-keys",
            json={"name": "Secretive Key"},
            headers=auth_headers,
        )

        response = await async_client.get("/api/v1/api-keys", headers=auth_headers)
        body = response.json()

        for key_data in body["data"]:
            assert "key" not in key_data, (
                f"SECURITY: List endpoint should NOT expose full API key for key {key_data.get('id')}"
            )


class TestRevokeApiKey:
    """DELETE /api/v1/api-keys/{id} — revokes (does not hard-delete)"""

    @pytest.mark.asyncio
    async def test_revoke_returns_204(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Happy path: revoke an API key returns 204 No Content.
        """
        # Create a key first
        create_resp = await async_client.post(
            "/api/v1/api-keys",
            json={"name": "To Revoke"},
            headers=auth_headers,
        )
        key_id = create_resp.json()["data"]["id"]

        response = await async_client.delete(
            f"/api/v1/api-keys/{key_id}", headers=auth_headers
        )

        assert response.status_code == 204, f"Expected 204, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_revoke_nonexistent_returns_404(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Revoking a non-existent key should return 404.
        """
        response = await async_client.delete(
            "/api/v1/api-keys/00000000-0000-0000-0000-000000000000",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_revoked_key_appears_as_revoked_in_list(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        After revoking, the key should show revoked=true in the list.
        """
        create_resp = await async_client.post(
            "/api/v1/api-keys",
            json={"name": "Will Be Revoked"},
            headers=auth_headers,
        )
        key_id = create_resp.json()["data"]["id"]

        # Revoke
        await async_client.delete(f"/api/v1/api-keys/{key_id}", headers=auth_headers)

        # List and verify revoked
        list_resp = await async_client.get("/api/v1/api-keys", headers=auth_headers)
        for k in list_resp.json()["data"]:
            if k["id"] == key_id:
                assert k["revoked"] is True, f"Key {key_id} should be revoked"

    @pytest.mark.asyncio
    async def test_revoke_requires_jwt_auth(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        Revoking without JWT should return 401.
        """
        # Create a key first (with auth)
        create_resp = await async_client.post(
            "/api/v1/api-keys",
            json={"name": "Key For Auth Test"},
            headers=auth_headers,
        )
        key_id = create_resp.json()["data"]["id"]

        # Try to revoke without auth
        response = await async_client.delete(f"/api/v1/api-keys/{key_id}")
        assert response.status_code == 401


class TestAuthenticateWithApiKey:
    """Access protected routes using API Key header."""

    @pytest.mark.asyncio
    async def test_api_key_authentication_accesses_protected_route(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        A valid API key should allow accessing protected endpoints.
        """
        # Create an API key
        create_resp = await async_client.post(
            "/api/v1/api-keys",
            json={"name": "Auth Key"},
            headers=auth_headers,
        )
        api_key = create_resp.json()["data"]["key"]

        # Use it to access a protected endpoint
        response = await async_client.get(
            "/api/v1/datasources",
            headers={"X-API-Key": api_key},
        )

        # Should NOT be 401
        assert response.status_code != 401, (
            f"Valid API key should not return 401, got {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_invalid_api_key_returns_401(self, async_client: AsyncClient):
        """
        An invalid/fake API key should return 401.
        """
        response = await async_client.get(
            "/api/v1/datasources",
            headers={"X-API-Key": "bcn_fake_invalid_key_12345"},
        )
        assert response.status_code == 401, f"Expected 401 for invalid API key, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_revoked_api_key_returns_401(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        A revoked API key should be rejected with 401.
        """
        # Create and get the key
        create_resp = await async_client.post(
            "/api/v1/api-keys",
            json={"name": "Soon Revoked"},
            headers=auth_headers,
        )
        api_key = create_resp.json()["data"]["key"]
        key_id = create_resp.json()["data"]["id"]

        # Revoke it
        await async_client.delete(f"/api/v1/api-keys/{key_id}", headers=auth_headers)

        # Try to use the revoked key
        response = await async_client.get(
            "/api/v1/datasources",
            headers={"X-API-Key": api_key},
        )
        assert response.status_code == 401, (
            f"Revoked API key should return 401, got {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_missing_api_key_header_returns_401(self, async_client: AsyncClient):
        """
        If no auth is provided at all, should return 401.
        """
        response = await async_client.get("/api/v1/datasources")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_wrong_api_key_prefix_returns_401(self, async_client: AsyncClient):
        """
        API key with wrong prefix should return 401.
        """
        response = await async_client.get(
            "/api/v1/datasources",
            headers={"X-API-Key": "not-bcn_prefix_key"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_empty_api_key_returns_401(self, async_client: AsyncClient):
        """
        Empty API key should return 401.
        """
        response = await async_client.get(
            "/api/v1/datasources",
            headers={"X-API-Key": ""},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_api_key_in_auth_header_rejected(
        self, async_client: AsyncClient, auth_headers: dict, test_db
    ):
        """
        API key in the Authorization: Bearer header should be rejected.
        API keys use X-API-Key header, not Bearer tokens.
        """
        create_resp = await async_client.post(
            "/api/v1/api-keys",
            json={"name": "Wrong Header Key"},
            headers=auth_headers,
        )
        api_key = create_resp.json()["data"]["key"]

        # Try to use API key as Bearer token
        response = await async_client.get(
            "/api/v1/datasources",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        # Should fail — API key is not a valid JWT
        assert response.status_code == 401
