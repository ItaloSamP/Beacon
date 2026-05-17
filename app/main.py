from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.presentation.api.router import router
from app.shared.config import settings
from app.shared.exceptions import AppException

app = FastAPI(title="Beacon", version=settings.APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/", tags=["root"])
async def root():
    return {"app": "Beacon", "version": settings.APP_VERSION, "docs": "/docs"}


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"data": None, "error": exc.error_code, "message": str(exc) or exc.error_code},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = ".".join(str(l) for l in err["loc"])
        messages.append(f"{loc}: {err['msg']}")
    return JSONResponse(
        status_code=422,
        content={"data": None, "error": "validation_error", "message": "; ".join(messages)},
    )
