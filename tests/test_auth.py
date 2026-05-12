"""
Integration tests for authentication endpoints.

Tests the full auth flow via HTTP:
- POST /api/v1/auth/register (201 + user + tokens)
- POST /api/v1/auth/login (200 + tokens, 401 on bad credentials)
- POST /api/v1/auth/refresh (200 + new tokens)
- POST /api/v1/auth/logout (204)
- Protected route access (200 with valid token, 401 without)

RED PHASE: All tests WILL FAIL because routes don't exist yet.
"""

import pytest
from httpx import AsyncClient


class TestRegister:
    """POST /api/v1/auth/register"""

    @pytest.mark.asyncio
    async def test_register_returns_201_with_user_and_tokens(self, async_client: AsyncClient, test_db):
        """
        Happy path: register a new user and get 201 with user info and tokens.
        """
        payload = {
            "email": "newuser@example.com",
            "password": "SecurePassword123!",
            "name": "New User",
        }

        response = await async_client.post("/api/v1/auth/register", json=payload)

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"

        body = response.json()
        assert body["error"] is None, f"Error should be null: {body['error']}"
        assert "data" in body

        data = body["data"]
        assert "user" in data, "Response should contain 'user'"
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "refresh_token" in data, "Response should contain 'refresh_token'"

        user = data["user"]
        assert user["email"] == "newuser@example.com"
        assert user["name"] == "New User"
        assert "password" not in user, "Password must NOT be in response"
        assert "password_hash" not in user, "Password hash must NOT be in response"
        assert "id" in user, "User should have an id"

    @pytest.mark.asyncio
    async def test_register_duplicate_email_returns_409(self, async_client: AsyncClient, test_db):
        """
        Registering with an existing email should return 409 Conflict.
        """
        payload = {
            "email": "duplicate@example.com",
            "password": "SecurePassword123!",
            "name": "First User",
        }

        # First registration — should succeed
        response1 = await async_client.post("/api/v1/auth/register", json=payload)
        assert response1.status_code == 201

        # Second registration — should fail with 409
        payload["name"] = "Second User"
        response2 = await async_client.post("/api/v1/auth/register", json=payload)

        assert response2.status_code == 409, f"Expected 409, got {response2.status_code}"
        body = response2.json()
        assert body["error"] is not None, "Error field should not be null"

    @pytest.mark.asyncio
    async def test_register_missing_email_returns_422(self, async_client: AsyncClient):
        """
        Register without email should return 422 Unprocessable Entity.
        """
        payload = {
            "password": "SecurePassword123!",
            "name": "No Email",
        }

        response = await async_client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_register_missing_password_returns_422(self, async_client: AsyncClient):
        """
        Register without password should return 422.
        """
        payload = {
            "email": "nopass@example.com",
            "name": "No Password",
        }

        response = await async_client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_invalid_email_format_returns_422(self, async_client: AsyncClient):
        """
        Register with invalid email format should return 422.
        """
        payload = {
            "email": "not-an-email",
            "password": "SecurePassword123!",
            "name": "Bad Email",
        }

        response = await async_client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_short_password_returns_422(self, async_client: AsyncClient):
        """
        Register with password shorter than minimum should return 422.
        """
        payload = {
            "email": "shortpass@example.com",
            "password": "123",
            "name": "Short Pass",
        }

        response = await async_client.post("/api/v1/auth/register", json=payload)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_returns_content_type_json(self, async_client: AsyncClient, test_db):
        """
        Response should have Content-Type: application/json.
        """
        payload = {
            "email": "json@example.com",
            "password": "SecurePassword123!",
            "name": "Json Test",
        }

        response = await async_client.post("/api/v1/auth/register", json=payload)
        content_type = response.headers.get("content-type", "")
        assert "application/json" in content_type


class TestLogin:
    """POST /api/v1/auth/login"""

    @pytest.mark.asyncio
    async def test_login_returns_200_with_tokens(self, async_client: AsyncClient, test_db):
        """
        Happy path: login with correct credentials returns 200 with tokens.
        Must first register the user.
        """
        # Register first
        register_payload = {
            "email": "login-test@example.com",
            "password": "TestPassword123!",
            "name": "Login Test",
        }
        reg_response = await async_client.post("/api/v1/auth/register", json=register_payload)
        assert reg_response.status_code == 201

        # Now login
        login_payload = {
            "email": "login-test@example.com",
            "password": "TestPassword123!",
        }
        response = await async_client.post("/api/v1/auth/login", json=login_payload)

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

        body = response.json()
        assert body["error"] is None
        data = body["data"]
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["email"] == "login-test@example.com"

    @pytest.mark.asyncio
    async def test_login_wrong_password_returns_401(self, async_client: AsyncClient, test_db):
        """
        Login with wrong password should return 401 Unauthorized.
        """
        # Register first
        await async_client.post("/api/v1/auth/register", json={
            "email": "wrongpass@example.com",
            "password": "CorrectPassword123!",
            "name": "Wrong Pass",
        })

        response = await async_client.post("/api/v1/auth/login", json={
            "email": "wrongpass@example.com",
            "password": "WrongPassword456!",
        })

        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        body = response.json()
        assert body["error"] is not None

    @pytest.mark.asyncio
    async def test_login_nonexistent_user_returns_401(self, async_client: AsyncClient):
        """
        Login for a user that doesn't exist should return 401.
        """
        response = await async_client.post("/api/v1/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "AnyPassword123!",
        })

        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_login_missing_email_returns_422(self, async_client: AsyncClient):
        """
        Login without email should return 422.
        """
        response = await async_client.post("/api/v1/auth/login", json={
            "password": "SomePass123!",
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_missing_password_returns_422(self, async_client: AsyncClient):
        """
        Login without password should return 422.
        """
        response = await async_client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
        })
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_login_empty_body_returns_422(self, async_client: AsyncClient):
        """
        Login with empty body should return 422.
        """
        response = await async_client.post("/api/v1/auth/login", json={})
        assert response.status_code == 422


class TestRefresh:
    """POST /api/v1/auth/refresh"""

    @pytest.mark.asyncio
    async def test_refresh_returns_200_with_new_tokens(self, async_client: AsyncClient, test_db):
        """
        Happy path: refresh with valid refresh token returns new tokens.
        """
        # Register to get a refresh token
        reg_response = await async_client.post("/api/v1/auth/register", json={
            "email": "refresh@example.com",
            "password": "TestPassword123!",
            "name": "Refresh Test",
        })
        assert reg_response.status_code == 201
        refresh_token = reg_response.json()["data"]["refresh_token"]

        # Refresh
        response = await async_client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token,
        })

        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.json()}"

        data = response.json()["data"]
        assert "access_token" in data, "Response should contain new access_token"
        assert "refresh_token" in data, "Response should contain new refresh_token"
        # New tokens should be different from the ones used
        assert data["access_token"] != refresh_token, "New access token should differ"

    @pytest.mark.asyncio
    async def test_refresh_with_invalid_token_returns_401(self, async_client: AsyncClient):
        """
        Refresh with an invalid token should return 401.
        """
        response = await async_client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid.token.here",
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_refresh_missing_token_returns_422(self, async_client: AsyncClient):
        """
        Refresh without refresh_token should return 422.
        """
        response = await async_client.post("/api/v1/auth/refresh", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_refresh_with_empty_token_returns_401(self, async_client: AsyncClient):
        """
        Refresh with empty string token should return 401.
        """
        response = await async_client.post("/api/v1/auth/refresh", json={
            "refresh_token": "",
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestLogout:
    """POST /api/v1/auth/logout"""

    @pytest.mark.asyncio
    async def test_logout_returns_204(self, async_client: AsyncClient, test_db):
        """
        Happy path: logout with valid token should return 204 No Content.
        """
        # Register
        reg_response = await async_client.post("/api/v1/auth/register", json={
            "email": "logout@example.com",
            "password": "TestPassword123!",
            "name": "Logout Test",
        })
        access_token = reg_response.json()["data"]["access_token"]

        headers = {"Authorization": f"Bearer {access_token}"}
        response = await async_client.post("/api/v1/auth/logout", headers=headers)

        assert response.status_code == 204, f"Expected 204, got {response.status_code}"
        # 204 has no body
        assert response.content == b"" or response.content == b"null", "204 should have no body"

    @pytest.mark.asyncio
    async def test_logout_without_token_returns_401(self, async_client: AsyncClient):
        """
        Logout without auth header should return 401.
        """
        response = await async_client.post("/api/v1/auth/logout")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_logout_with_invalid_token_returns_401(self, async_client: AsyncClient):
        """
        Logout with an invalid/expired token should return 401.
        """
        headers = {"Authorization": "Bearer invalid.jwt.token"}
        response = await async_client.post("/api/v1/auth/logout", headers=headers)
        assert response.status_code == 401


class TestProtectedRouteAccess:
    """Access control: protected routes require valid JWT."""

    @pytest.mark.asyncio
    async def test_protected_route_with_valid_token_returns_200(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """
        Accessing a protected route with valid JWT should succeed.
        Using /api/v1/datasources as the protected route.
        """
        response = await async_client.get("/api/v1/datasources", headers=auth_headers)

        # Should NOT be 401
        assert response.status_code != 401, (
            f"Valid token should not return 401, got {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_protected_route_without_token_returns_401(self, async_client: AsyncClient):
        """
        Accessing a protected route without auth header should return 401.
        """
        response = await async_client.get("/api/v1/datasources")
        assert response.status_code == 401, (
            f"Expected 401 for unauthenticated request, got {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_protected_route_with_expired_token_returns_401(
        self, async_client: AsyncClient
    ):
        """
        Accessing a protected route with expired token should return 401.
        """
        import time
        import jwt as pyjwt
        from app.shared.config import settings

        expired_token = pyjwt.encode(
            {
                "sub": "test-uuid",
                "exp": int(time.time()) - 3600,
                "type": "access",
            },
            settings.JWT_SECRET,
            algorithm=settings.JWT_ALGORITHM,
        )

        headers = {"Authorization": f"Bearer {expired_token}"}
        response = await async_client.get("/api/v1/datasources", headers=headers)
        assert response.status_code == 401, f"Expected 401 for expired token, got {response.status_code}"

    @pytest.mark.asyncio
    async def test_protected_route_with_malformed_auth_header_returns_401(
        self, async_client: AsyncClient
    ):
        """
        Malformed Authorization header should return 401.
        """
        # Missing "Bearer" prefix
        headers = {"Authorization": "not-bearer something"}
        response = await async_client.get("/api/v1/datasources", headers=headers)
        assert response.status_code == 401

        # Completely malformed
        headers = {"Authorization": "garbage"}
        response = await async_client.get("/api/v1/datasources", headers=headers)
        assert response.status_code == 401


# Fix: pytest_asyncio_fixture should be pytest_asyncio.fixture
import pytest_asyncio
