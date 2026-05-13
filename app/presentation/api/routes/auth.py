from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_db
from app.infrastructure.repositories.user_repo import UserRepository
from app.application.auth_service import AuthService
from app.presentation.api.middleware.auth import require_auth
from app.domain.schemas import (
    RegisterRequest,
    LoginRequest,
    RefreshRequest,
    AuthResponse,
    RefreshResponse,
)

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


@router.post("/logout", status_code=204)
async def logout(user: dict = Depends(require_auth)):
    return None
