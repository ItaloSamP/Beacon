from fastapi import APIRouter

from app.presentation.api.routes import health, auth, datasources, pipelines, api_keys

router = APIRouter(prefix="/api/v1")
router.include_router(health.router, tags=["health"])
router.include_router(auth.router, tags=["auth"])
router.include_router(datasources.router, tags=["datasources"])
router.include_router(pipelines.router, tags=["pipelines"])
router.include_router(api_keys.router, tags=["api_keys"])
