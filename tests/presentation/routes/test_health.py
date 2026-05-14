"""
Integration tests for GET /api/v1/health endpoint.

Verifies the health endpoint returns the correct status, version,
database connectivity, uptime, and timestamp.

RED PHASE: Tests WILL FAIL because the endpoint doesn't exist yet.
"""

import pytest
from httpx import AsyncClient


class TestHealthEndpoint:
    """Health endpoint: GET /api/v1/health"""

    @pytest.mark.asyncio
    async def test_health_returns_200(self, async_client: AsyncClient):
        """
        Happy path: health endpoint returns 200 OK.
        """
        response = await async_client.get("/api/v1/health")

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_response_shape(self, async_client: AsyncClient):
        """
        Response must contain: status, version, database, uptime_seconds, timestamp.
        """
        response = await async_client.get("/api/v1/health")

        body = response.json()
        assert "data" in body, "Response must have 'data' key"
        assert body["error"] is None, "Response 'error' must be null"

        data = body["data"]
        required_keys = ["status", "version", "database", "uptime_seconds", "timestamp"]
        for key in required_keys:
            assert key in data, f"Expected '{key}' in health response data"

    @pytest.mark.asyncio
    async def test_health_status_is_healthy(self, async_client: AsyncClient):
        """
        When the system is running, status should be 'healthy'.
        """
        response = await async_client.get("/api/v1/health")

        data = response.json()["data"]
        assert data["status"] == "healthy", f"Expected status 'healthy', got '{data['status']}'"

    @pytest.mark.asyncio
    async def test_health_version_is_string(self, async_client: AsyncClient):
        """
        Version should be a non-empty string (e.g., '0.1.0').
        """
        response = await async_client.get("/api/v1/health")

        data = response.json()["data"]
        version = data["version"]
        assert isinstance(version, str), f"Expected version to be str, got {type(version)}"
        assert len(version) > 0, "Version should not be empty"

    @pytest.mark.asyncio
    async def test_health_database_is_connected(self, async_client: AsyncClient):
        """
        Database status should be 'connected' when DB is reachable.
        """
        response = await async_client.get("/api/v1/health")

        data = response.json()["data"]
        assert data["database"] == "connected", (
            f"Expected database 'connected', got '{data['database']}'"
        )

    @pytest.mark.asyncio
    async def test_health_uptime_is_positive_number(self, async_client: AsyncClient):
        """
        Uptime should be a non-negative number (float or int).
        """
        response = await async_client.get("/api/v1/health")

        data = response.json()["data"]
        uptime = data["uptime_seconds"]
        assert isinstance(uptime, (int, float)), (
            f"Expected uptime_seconds to be number, got {type(uptime)}"
        )
        assert uptime >= 0, f"Uptime should be >= 0, got {uptime}"

    @pytest.mark.asyncio
    async def test_health_timestamp_is_iso_format(self, async_client: AsyncClient):
        """
        Timestamp should be an ISO 8601 datetime string.
        """
        response = await async_client.get("/api/v1/health")

        data = response.json()["data"]
        timestamp = data["timestamp"]
        assert "T" in timestamp, f"Expected ISO 8601 timestamp, got '{timestamp}'"
        # Verify it's parseable as a datetime string (presence of T, Z, or offset)
        assert any(
            c in timestamp for c in ["T", "Z", "+", "-"]
        ), f"Timestamp doesn't look like ISO 8601: '{timestamp}'"

    @pytest.mark.asyncio
    async def test_health_content_type_is_json(self, async_client: AsyncClient):
        """
        Response content-type should be application/json.
        """
        response = await async_client.get("/api/v1/health")

        content_type = response.headers.get("content-type", "")
        assert "application/json" in content_type, (
            f"Expected JSON content-type, got '{content_type}'"
        )
