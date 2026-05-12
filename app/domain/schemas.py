from pydantic import BaseModel, EmailStr, field_validator
from typing import Any, Optional
from uuid import UUID
from datetime import datetime

from app.domain.models import DataSourceType, DataSourceStatus, PipelineType


class ApiResponse(BaseModel):
    data: Any | None = None
    error: str | None = None


class PaginatedApiResponse(ApiResponse):
    meta: dict | None = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("password must not be empty")
        return v


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str

    model_config = {"from_attributes": True}


class AuthData(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str


class AuthResponse(ApiResponse):
    data: AuthData | None = None


class RefreshData(BaseModel):
    access_token: str
    refresh_token: str


class RefreshResponse(ApiResponse):
    data: RefreshData | None = None


class DataSourceCreate(BaseModel):
    name: str
    type: DataSourceType
    connection_config: dict = {}
    status: DataSourceStatus = DataSourceStatus.active

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v


class DataSourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[DataSourceType] = None
    connection_config: Optional[dict] = None
    status: Optional[DataSourceStatus] = None


class DataSourceResponse(BaseModel):
    id: str
    name: str
    type: str
    connection_config: dict
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DataSourceNested(BaseModel):
    id: str
    name: str

    model_config = {"from_attributes": True}


class PipelineCreate(BaseModel):
    name: str
    type: PipelineType
    data_source_id: UUID
    schedule: Optional[str] = None
    config: dict = {}
    enabled: bool = True

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[PipelineType] = None
    schedule: Optional[str] = None
    config: Optional[dict] = None
    enabled: Optional[bool] = None


class PipelineResponse(BaseModel):
    id: str
    name: str
    type: str
    data_source_id: str
    schedule: Optional[str] = None
    config: dict
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PipelineDetailResponse(PipelineResponse):
    data_source: Optional[DataSourceNested] = None


class ApiKeyCreate(BaseModel):
    name: str
    expires_at: Optional[datetime] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v


class ApiKeyFullResponse(BaseModel):
    id: str
    name: str
    prefix: str
    key: str
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyListResponse(BaseModel):
    id: str
    name: str
    prefix: str
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    revoked: bool
    created_at: datetime

    model_config = {"from_attributes": True}
