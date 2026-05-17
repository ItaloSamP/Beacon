import hashlib
from datetime import datetime, timezone

from fastapi import Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.repositories.api_key_repo import ApiKeyRepository
from app.infrastructure.security import decode_token
from app.shared.exceptions import UnauthorizedException
from app.shared.config import settings


async def require_auth(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    api_key = request.headers.get("X-API-Key")
    if api_key is not None:
        if not api_key:
            raise UnauthorizedException("Not authenticated")
        if not api_key.startswith(settings.API_KEY_PREFIX):
            raise UnauthorizedException("Not authenticated")

        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        repo = ApiKeyRepository(db)
        key_obj = await repo.get_by_key_hash(key_hash)

        if not key_obj or key_obj.revoked:
            raise UnauthorizedException("Not authenticated")

        if key_obj.expires_at and key_obj.expires_at < datetime.now(timezone.utc):
            raise UnauthorizedException("Not authenticated")

        key_obj.last_used_at = datetime.now(timezone.utc)
        await repo.update(key_obj)

        return {"user_id": str(key_obj.user_id), "auth_method": "api_key"}

    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise UnauthorizedException("Not authenticated")

    if not auth_header.startswith("Bearer "):
        raise UnauthorizedException("Not authenticated")

    token = auth_header[7:]
    try:
        payload = decode_token(token)
        return {"user_id": payload["sub"]}
    except Exception:
        # Try agent token
        if token.startswith(settings.AGENT_TOKEN_PREFIX):
            from app.infrastructure.repositories.agent_token_repo import AgentTokenRepository
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            repo = AgentTokenRepository(db)
            agent_token_obj = await repo.get_by_token_hash(token_hash)
            if agent_token_obj and agent_token_obj.agent:
                return {
                    "agent_id": str(agent_token_obj.agent_id),
                    "user_id": str(agent_token_obj.agent.user_id),
                    "auth_method": "agent_token",
                }
        raise UnauthorizedException("Invalid or expired token")
