from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.repositories.api_key_repo import ApiKeyRepository
from app.infrastructure.security import generate_api_key
from app.presentation.api.middleware.auth import require_auth
from app.shared.exceptions import NotFoundException
from app.shared.config import settings
from app.domain.models import ApiKey
from app.domain.schemas import ApiKeyCreate, ApiResponse

router = APIRouter(prefix="/api-keys", tags=["api_keys"])


@router.post("", status_code=201)
async def create_api_key(
    req: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_auth),
):
    raw_key, key_hash = generate_api_key()

    api_key = ApiKey(
        user_id=UUID(user["user_id"]),
        name=req.name,
        prefix=settings.API_KEY_PREFIX,
        key_hash=key_hash,
        expires_at=req.expires_at,
    )
    repo = ApiKeyRepository(db)
    api_key = await repo.create(api_key)

    return ApiResponse(
        data={
            "id": str(api_key.id),
            "name": api_key.name,
            "prefix": api_key.prefix,
            "key": raw_key,
            "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
            "created_at": api_key.created_at.isoformat() if api_key.created_at else None,
        },
        error=None,
    )


@router.get("")
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_auth),
):
    repo = ApiKeyRepository(db)
    keys = await repo.list_by_user(UUID(user["user_id"]))

    data_list = []
    for k in keys:
        data_list.append({
            "id": str(k.id),
            "name": k.name,
            "prefix": k.prefix,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "expires_at": k.expires_at.isoformat() if k.expires_at else None,
            "revoked": k.revoked,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        })

    return ApiResponse(data=data_list, error=None)


@router.delete("/{id}", status_code=204)
async def revoke_api_key(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_auth),
):
    repo = ApiKeyRepository(db)
    key = await repo.get_by_id(id)
    if not key:
        raise NotFoundException("API key not found")

    key.revoked = True
    await repo.update(key)
    return None
