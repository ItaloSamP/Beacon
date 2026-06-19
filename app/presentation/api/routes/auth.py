from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.auth_service import AuthService
from app.domain.schemas import (
    AuthResponse,
    LoginRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
)
from app.infrastructure.database import get_db
from app.infrastructure.repositories.user_repo import UserRepository
from app.presentation.api.middleware.auth import require_auth

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(UserRepository(db))
    result = await service.register(email=req.email, password=req.password, name=req.name)
    return AuthResponse(data=result, error=None)


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(UserRepository(db))
    result = await service.login(email=req.email, password=req.password)
    return AuthResponse(data=result, error=None)


@router.post("/refresh")
async def refresh(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    service = AuthService(UserRepository(db))
    result = await service.refresh_token(refresh_token=req.refresh_token)
    return RefreshResponse(data=result, error=None)


@router.get("/me")
async def me(user: dict = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    service = AuthService(UserRepository(db))
    user_obj = await service.get_user(user["user_id"])
    return {
        "data": {
            "user": {
                "id": str(user_obj.id),
                "email": user_obj.email,
                "name": user_obj.name,
            }
        },
        "error": None,
    }


@router.post("/logout", status_code=204)
async def logout(user: dict = Depends(require_auth)):
    return None
