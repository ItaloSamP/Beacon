from email_validator import validate_email, EmailNotValidError

from app.domain.models import User
from app.infrastructure.repositories.user_repo import UserRepository
from app.infrastructure.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.shared.exceptions import ConflictException, UnauthorizedException, ValidationException


class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def register(self, email: str, password: str, name: str) -> dict:
        try:
            valid = validate_email(email)
            email = valid.normalized
        except EmailNotValidError:
            raise ValidationException("Invalid email format", error_code="invalid_email")

        if len(password) < 8:
            raise ValidationException("Password must be at least 8 characters", error_code="weak_password")

        if not name or not name.strip():
            raise ValidationException("Name must not be empty", error_code="invalid_name")

        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ConflictException("Email already registered", error_code="email_exists")

        user = User(
            email=email,
            password_hash=hash_password(password),
            name=name.strip(),
        )
        user = await self.user_repo.create(user)

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    async def login(self, email: str, password: str) -> dict:
        if not password:
            raise UnauthorizedException("Invalid credentials", error_code="invalid_credentials")

        user = await self.user_repo.get_by_email(email)
        if not user:
            raise UnauthorizedException("Invalid credentials", error_code="invalid_credentials")

        if not verify_password(password, user.password_hash):
            raise UnauthorizedException("Invalid credentials", error_code="invalid_credentials")

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    async def refresh_token(self, refresh_token: str) -> dict:
        if not refresh_token:
            raise UnauthorizedException("Invalid token", error_code="invalid_token")

        try:
            payload = decode_token(refresh_token)
        except Exception:
            raise UnauthorizedException("Invalid or expired token", error_code="invalid_token")

        if payload.get("type") != "refresh":
            raise UnauthorizedException("Invalid token type", error_code="invalid_token")

        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException("Invalid token", error_code="invalid_token")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UnauthorizedException("User not found", error_code="invalid_token")

        new_access_token = create_access_token(str(user.id))
        new_refresh_token = create_refresh_token(str(user.id))

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
        }
