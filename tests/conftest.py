"""
Test fixtures for Beacon backend.

These fixtures provide:
- Create a FastAPI TestClient for HTTP integration tests
- Manage test database lifecycle (create/drop tables per test)
- Provide pre-authenticated auth headers
- Provide sample data for CRUD tests (Agent, DataSource, Pipeline)
"""

import os
os.environ["EMAIL_CHECK_DELIVERABILITY"] = "false"

import pytest_asyncio

from httpx import AsyncClient, ASGITransport

# ============================================================
# IMPORTS THAT WILL FAIL (RED PHASE — modules don't exist yet)
# ============================================================
from app.main import app
from app.infrastructure.database import get_db, engine, Base, async_session_factory


# ============================================================
# Override the get_db dependency for testing
# ============================================================

@pytest_asyncio.fixture(scope="function")
async def test_db():
    """
    Create a fresh test database session with all tables for each test.

    Strategy:
    - Create all tables at start of test
    - Yield an async session
    - Drop all tables at end of test (cleanup)

    RED PHASE: Will fail because engine/Base don't exist yet.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        # Override the get_db dependency to use test session
        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db

        yield session

        app.dependency_overrides.clear()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def async_client(test_db) -> AsyncClient:
    """
    Create an httpx AsyncClient attached to the FastAPI app.

    Uses ASGITransport for true async testing without a server.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


# ============================================================
# Auth fixtures
# ============================================================

@pytest_asyncio.fixture(scope="function")
async def auth_headers(async_client: AsyncClient, test_db) -> dict:
    """
    Register a test user and return Authorization headers with Bearer token.

    Returns a dict with 'Authorization': 'Bearer <access_token>'
    to be used in authenticated requests.

    Uses the test user credentials:
      email: test@example.com
      password: TestPassword123!
    """
    register_payload = {
        "email": "test@example.com",
        "password": "TestPassword123!",
        "name": "Test User",
    }

    response = await async_client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201, f"Failed to register test user: {response.json()}"

    data = response.json()["data"]
    access_token = data["access_token"]

    return {"Authorization": f"Bearer {access_token}"}


@pytest_asyncio.fixture(scope="function")
async def auth_refresh_token(async_client: AsyncClient, test_db) -> str:
    """
    Register and return a refresh token string for testing refresh flow.
    """
    register_payload = {
        "email": "refresh-test@example.com",
        "password": "TestPassword123!",
        "name": "Refresh Test User",
    }

    response = await async_client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201

    return response.json()["data"]["refresh_token"]


@pytest_asyncio.fixture(scope="function")
async def user_email_and_password() -> tuple:
    """Return test credentials for reuse in login tests."""
    return "test@example.com", "TestPassword123!"


# ============================================================
# Data fixtures
# ============================================================

@pytest_asyncio.fixture(scope="function")
async def sample_agent(async_client: AsyncClient, auth_headers: dict) -> dict:
    """
    Create a sample Agent via the API and return its data dict.

    This fixture depends on auth_headers so the user is already created.
    """
    payload = {
        "name": "Test Production Agent",
        "status": "online",
        "version": "0.1.0",
    }

    response = await async_client.post(
        "/api/v1/agents", json=payload, headers=auth_headers
    )
    assert response.status_code == 201, f"Failed to create sample agent: {response.json()}"

    return response.json()["data"]


@pytest_asyncio.fixture(scope="function")
async def sample_datasource(async_client: AsyncClient, auth_headers: dict, sample_agent: dict) -> dict:
    """
    Create a sample DataSource via the API and return its data dict.

    This fixture depends on auth_headers and sample_agent so both
    the user and agent are already created. The datasource is linked to the agent.
    """
    payload = {
        "name": "Test PostgreSQL DB",
        "type": "postgres",
        "connection_config": {
            "host": "localhost",
            "port": 5432,
            "database": "test_db",
            "username": "test_user",
            "password": "test_pass",
        },
        "status": "active",
        "agent_id": sample_agent["id"],
    }

    response = await async_client.post(
        "/api/v1/datasources", json=payload, headers=auth_headers
    )
    assert response.status_code == 201, f"Failed to create sample datasource: {response.json()}"

    return response.json()["data"]


@pytest_asyncio.fixture(scope="function")
async def sample_pipeline(async_client: AsyncClient, auth_headers: dict, sample_datasource: dict) -> dict:
    """
    Create a sample Pipeline via the API and return its data dict.

    Depends on sample_datasource for the FK reference.
    """
    payload = {
        "name": "Daily Volume Check",
        "type": "volume",
        "data_source_id": sample_datasource["id"],
        "schedule": "0 6 * * *",
        "config": {
            "query": "SELECT COUNT(*) FROM orders",
            "threshold": 1000,
            "min_expected": 500,
        },
        "enabled": True,
    }

    response = await async_client.post(
        "/api/v1/pipelines", json=payload, headers=auth_headers
    )
    assert response.status_code == 201, f"Failed to create sample pipeline: {response.json()}"

    return response.json()["data"]


# ============================================================
# Utility helpers for tests
# ============================================================

def assert_response_shape(data: dict, required_keys: list[str], entity_name: str = "data"):
    """Verify that a response data dict contains all required keys."""
    for key in required_keys:
        assert key in data, f"Expected '{key}' in {entity_name}, got keys: {list(data.keys())}"


def assert_error_response(response, expected_status: int, expected_error: str = None):
    """Assert that an error response has the correct shape and status."""
    assert response.status_code == expected_status
    body = response.json()
    assert "data" in body
    assert "error" in body
    if expected_error:
        assert body["error"] == expected_error, f"Expected error '{expected_error}', got '{body['error']}'"
