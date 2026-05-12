from fastapi import APIRouter
from datetime import datetime, timezone

from sqlalchemy import text

from app.shared.config import settings
from app.infrastructure.database import engine

router = APIRouter()
_start_time = datetime.now(timezone.utc)


@router.get("/health")
async def health():
    uptime = (datetime.now(timezone.utc) - _start_time).total_seconds()
    db_status = "connected"
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    return {
        "data": {
            "status": "healthy" if db_status == "connected" else "degraded",
            "version": settings.APP_VERSION,
            "uptime_seconds": uptime,
            "database": db_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        "error": None,
    }
