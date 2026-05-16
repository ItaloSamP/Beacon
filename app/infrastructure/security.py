import bcrypt
import jwt as pyjwt
import secrets
import hashlib
from datetime import datetime, timedelta, timezone

from app.shared.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expire, "type": "access"}
    return pyjwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire, "type": "refresh"}
    return pyjwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return pyjwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def generate_api_key() -> tuple[str, str]:
    raw = secrets.token_hex(32)
    full_key = f"{settings.API_KEY_PREFIX}{raw}"
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, key_hash


def generate_agent_token() -> tuple[str, str, str]:
    """Returns (full_token, token_hash, token_prefix)."""
    raw = secrets.token_urlsafe(36)  # 48 chars base64
    full_token = f"{settings.AGENT_TOKEN_PREFIX}{raw}"
    token_hash = hashlib.sha256(full_token.encode()).hexdigest()
    token_prefix = full_token[:20]  # First 20 chars including prefix
    return full_token, token_hash, token_prefix
