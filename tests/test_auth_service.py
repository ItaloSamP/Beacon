"""
Unit tests for AuthService — business logic only, no HTTP.

Tests the core authentication logic:
- Password hashing (bcrypt)
- Registration (valid/invalid inputs)
- Login (valid/invalid credentials)
- JWT token generation and validation
- Refresh token logic

RED PHASE: All tests WILL FAIL because AuthService doesn't exist yet.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# ============================================================
# IMPORTS THAT WILL FAIL (RED PHASE)
# ============================================================
from app.application.auth_service import AuthService
from app.domain.models import User
from app.infrastructure.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


class TestPasswordHashing:
    """Password hashing and verification (infrastructure/security.py)."""

    def test_hash_password_returns_different_from_input(self):
        """Hashed password should be different from the plain text password."""
        plain = "securePassword123"
        hashed = hash_password(plain)
        assert hashed != plain, "Hashed password should not equal plain text"
        assert len(hashed) > 0, "Hash should not be empty"

    def test_hash_password_is_deterministic_for_verification(self):
        """Same password should produce a hash that verifies correctly (via bcrypt)."""
        plain = "securePassword123"
        hashed = hash_password(plain)
        assert verify_password(plain, hashed), "Password should verify against its hash"

    def test_verify_password_rejects_wrong_password(self):
        """Verification should fail for an incorrect password."""
        plain = "securePassword123"
        hashed = hash_password(plain)
        assert not verify_password("wrongPassword", hashed), (
            "Wrong password should not verify"
        )

    def test_verify_password_rejects_empty_password(self):
        """Verification should fail for an empty password."""
        hashed = hash_password("somePassword")
        assert not verify_password("", hashed), "Empty password should not verify"

    def test_hash_password_different_each_time(self):
        """Bcrypt should produce different hashes even for the same password (salt)."""
        plain = "securePassword123"
        hash1 = hash_password(plain)
        hash2 = hash_password(plain)
        assert hash1 != hash2, "Bcrypt hashes should be unique due to random salt"


class TestAuthServiceRegister:
    """AuthService.register() — user registration logic."""

    @pytest.fixture
    def mock_user_repo(self):
        """Mock UserRepository with AsyncMock methods."""
        repo = AsyncMock()
        repo.get_by_email = AsyncMock(return_value=None)  # No existing user
        repo.create = AsyncMock()
        return repo

    @pytest.fixture
    def auth_service(self, mock_user_repo):
        """Create AuthService with mocked repository."""
        return AuthService(user_repo=mock_user_repo)

    @pytest.mark.asyncio
    async def test_register_creates_user_with_hashed_password(self, auth_service, mock_user_repo):
        """
        Registration should:
        - Check for existing email (should be None)
        - Create a user with hashed password (not plain text)
        - Return user + tokens
        """
        result = await auth_service.register(
            email="new@example.com",
            password="SecurePass123",
            name="New User",
        )

        # The password stored should be hashed, not the plain text
        mock_user_repo.create.assert_called_once()
        call_args = mock_user_repo.create.call_args
        # The created user should have a password_hash, not the raw password
        created_user = call_args[0][0] if call_args[0] else call_args[1].get("user")
        if created_user:
            assert hasattr(created_user, "password_hash"), "User should have password_hash field"
            assert created_user.password_hash != "SecurePass123", "Stored password should be hashed"

        # Result should contain user, access_token, refresh_token
        assert "user" in result, "Result should contain 'user'"
        assert "access_token" in result, "Result should contain 'access_token'"
        assert "refresh_token" in result, "Result should contain 'refresh_token'"
        assert result["user"]["email"] == "new@example.com"

    @pytest.mark.asyncio
    async def test_register_rejects_duplicate_email(self, auth_service, mock_user_repo):
        """
        Registration should fail if email already exists.
        """
        existing_user = MagicMock(spec=User)
        existing_user.email = "existing@example.com"
        mock_user_repo.get_by_email.return_value = existing_user

        with pytest.raises(Exception) as exc_info:
            await auth_service.register(
                email="existing@example.com",
                password="SecurePass123",
                name="Duplicate User",
            )

        # Should raise some kind of conflict/duplicate error
        error_str = str(exc_info.value).lower()
        assert any(
            word in error_str for word in ["exist", "duplicate", "already", "conflict"]
        ), f"Expected duplicate email error, got: {exc_info.value}"

    @pytest.mark.asyncio
    async def test_register_validates_email_format(self, auth_service):
        """
        Registration should validate email format.
        """
        invalid_emails = ["not-an-email", "", "@missing-user.com", "no-domain@"]

        for email in invalid_emails:
            with pytest.raises(Exception):
                await auth_service.register(
                    email=email,
                    password="SecurePass123",
                    name="Test User",
                )

    @pytest.mark.asyncio
    async def test_register_validates_password_minimum_length(self, auth_service):
        """
        Registration should reject short passwords.
        """
        short_passwords = ["", "abc", "12345"]

        for pw in short_passwords:
            with pytest.raises(Exception):
                await auth_service.register(
                    email="test@example.com",
                    password=pw,
                    name="Test User",
                )

    @pytest.mark.asyncio
    async def test_register_validates_name_not_empty(self, auth_service):
        """
        Registration should reject empty names.
        """
        with pytest.raises(Exception):
            await auth_service.register(
                email="test@example.com",
                password="SecurePass123",
                name="",
            )


class TestAuthServiceLogin:
    """AuthService.login() — user login logic."""

    @pytest.fixture
    def mock_user_repo(self):
        """Mock with an existing user that has a known password hash."""
        repo = AsyncMock()

        # Create a mock user with a known hashed password
        mock_user = MagicMock(spec=User)
        mock_user.id = "test-user-uuid"
        mock_user.email = "test@example.com"
        mock_user.name = "Test User"
        mock_user.password_hash = hash_password("CorrectPass123")

        repo.get_by_email = AsyncMock(return_value=mock_user)
        return repo

    @pytest.fixture
    def auth_service(self, mock_user_repo):
        return AuthService(user_repo=mock_user_repo)

    @pytest.mark.asyncio
    async def test_login_success_returns_tokens(self, auth_service):
        """
        Successful login should return access_token, refresh_token, and user info.
        """
        result = await auth_service.login(
            email="test@example.com",
            password="CorrectPass123",
        )

        assert "access_token" in result
        assert "refresh_token" in result
        assert "user" in result
        assert result["user"]["email"] == "test@example.com"
        assert result["user"]["name"] == "Test User"
        assert "password_hash" not in result["user"], "Password hash must NOT be exposed"

    @pytest.mark.asyncio
    async def test_login_fails_with_wrong_password(self, auth_service):
        """
        Login should raise an error for incorrect password.
        """
        with pytest.raises(Exception) as exc_info:
            await auth_service.login(
                email="test@example.com",
                password="WrongPassword",
            )

        error_str = str(exc_info.value).lower()
        assert any(
            word in error_str for word in ["invalid", "wrong", "credential", "unauthorized"]
        ), f"Expected invalid credentials error, got: {exc_info.value}"

    @pytest.mark.asyncio
    async def test_login_fails_for_nonexistent_user(self, auth_service, mock_user_repo):
        """
        Login should raise an error when the user doesn't exist.
        """
        mock_user_repo.get_by_email.return_value = None

        with pytest.raises(Exception):
            await auth_service.login(
                email="nonexistent@example.com",
                password="AnyPassword",
            )

    @pytest.mark.asyncio
    async def test_login_fails_with_empty_password(self, auth_service):
        """
        Login should reject empty password.
        """
        with pytest.raises(Exception):
            await auth_service.login(
                email="test@example.com",
                password="",
            )


class TestTokenGenerationAndValidation:
    """JWT token generation and validation."""

    def test_create_access_token_returns_jwt_string(self):
        """Access token should be a valid JWT string (3 parts separated by dots)."""
        token = create_access_token(user_id="test-uuid")
        assert isinstance(token, str)
        parts = token.split(".")
        assert len(parts) == 3, f"JWT should have 3 parts, got {len(parts)}"

    def test_create_refresh_token_returns_jwt_string(self):
        """Refresh token should be a valid JWT string."""
        token = create_refresh_token(user_id="test-uuid")
        assert isinstance(token, str)
        parts = token.split(".")
        assert len(parts) == 3, f"JWT should have 3 parts, got {len(parts)}"

    def test_access_token_and_refresh_token_are_different(self):
        """Access and refresh tokens should be different strings."""
        access = create_access_token(user_id="test-uuid")
        refresh = create_refresh_token(user_id="test-uuid")
        assert access != refresh, "Access and refresh tokens should be different"

    def test_decode_access_token_returns_payload(self):
        """Decoding a valid access token should return the original payload."""
        user_id = "test-uuid"
        token = create_access_token(user_id=user_id)
        payload = decode_token(token)

        assert payload is not None, "Decoded payload should not be None"
        assert "sub" in payload, "Payload should contain 'sub' claim"
        assert payload["sub"] == user_id, (
            f"Expected sub '{user_id}', got '{payload.get('sub')}'"
        )

    def test_decode_token_rejects_expired_token(self):
        """
        Decoding an expired token should raise an error or return None.
        """
        import time
        import jwt as pyjwt

        # Create a token that expired 1 hour ago (using PyJWT directly to force expiry)
        from app.shared.config import settings

        expired_token = pyjwt.encode(
            {"sub": "test", "exp": int(time.time()) - 3600},
            settings.JWT_SECRET,
            algorithm=settings.JWT_ALGORITHM,
        )

        with pytest.raises(Exception):
            decode_token(expired_token)

    def test_decode_token_rejects_invalid_token(self):
        """Decoding garbage data should raise an error."""
        with pytest.raises(Exception):
            decode_token("not.a.valid.jwt.token")

    def test_decode_token_rejects_empty_token(self):
        """Decoding an empty string should raise an error."""
        with pytest.raises(Exception):
            decode_token("")

    def test_decode_token_rejects_tampered_token(self):
        """Decoding a token with modified payload should raise an error."""
        token = create_access_token(user_id="original")
        parts = token.split(".")
        # Tamper with the payload (middle part)
        tampered = parts[0] + ".tamperedPayload." + parts[2]
        with pytest.raises(Exception):
            decode_token(tampered)


class TestRefreshTokenFlow:
    """Refresh token logic in AuthService."""

    @pytest.fixture
    def mock_user_repo(self):
        repo = AsyncMock()
        mock_user = MagicMock(spec=User)
        mock_user.id = "test-uuid"
        mock_user.email = "test@example.com"
        repo.get_by_id = AsyncMock(return_value=mock_user)
        return repo

    @pytest.fixture
    def auth_service(self, mock_user_repo):
        return AuthService(user_repo=mock_user_repo)

    @pytest.mark.asyncio
    async def test_refresh_token_returns_new_tokens(self, auth_service):
        """
        Refreshing with a valid refresh token should return new access and refresh tokens.
        """
        refresh_token = create_refresh_token(user_id="test-uuid")

        result = await auth_service.refresh_token(refresh_token=refresh_token)

        assert "access_token" in result
        assert "refresh_token" in result
        assert result["access_token"] != refresh_token, "New access token should differ from refresh"

    @pytest.mark.asyncio
    async def test_refresh_with_invalid_token_raises_error(self, auth_service):
        """
        Refreshing with an invalid/expired refresh token should raise an error.
        """
        with pytest.raises(Exception):
            await auth_service.refresh_token(refresh_token="invalid.token.here")

    @pytest.mark.asyncio
    async def test_refresh_with_expired_token_raises_error(self, auth_service):
        """
        Refreshing with an expired refresh token should raise an error.
        """
        import time
        import jwt as pyjwt
        from app.shared.config import settings

        expired_token = pyjwt.encode(
            {"sub": "test-uuid", "exp": int(time.time()) - 3600, "type": "refresh"},
            settings.JWT_SECRET,
            algorithm=settings.JWT_ALGORITHM,
        )

        with pytest.raises(Exception):
            await auth_service.refresh_token(refresh_token=expired_token)
