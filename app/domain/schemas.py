from pydantic import BaseModel, EmailStr, field_validator
from typing import Any, Optional
from uuid import UUID
from datetime import datetime

from app.domain.models import DataSourceType, DataSourceStatus, PipelineType, AgentStatus


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
    agent_id: Optional[UUID] = None
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
    agent_id: Optional[UUID] = None
    connection_config: Optional[dict] = None
    status: Optional[DataSourceStatus] = None


class DataSourceResponse(BaseModel):
    id: str
    name: str
    type: str
    agent_id: Optional[str] = None
    agent: Optional[dict] = None
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


class AgentCreate(BaseModel):
    name: str
    status: AgentStatus = AgentStatus.offline
    version: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[AgentStatus] = None
    version: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and (not v or not v.strip()):
            raise ValueError("name must not be empty")
        return v


class AgentResponse(BaseModel):
    id: str
    name: str
    status: str
    user_id: str
    last_heartbeat_at: Optional[datetime] = None
    version: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentTokenResponse(BaseModel):
    id: str
    token_prefix: str
    name: str
    last_used_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AnomalyCreate(BaseModel):
    pipeline_run_id: str
    type: str
    severity: str
    description: Optional[str] = None
    deviation_details: Optional[dict] = None


class AnomalyResponse(BaseModel):
    id: str
    pipeline_run_id: str
    severity: str
    type: str
    description: Optional[str] = None
    deviation_details: Optional[dict] = None
    detected_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PipelineRunTriggerResponse(BaseModel):
    run_id: str
    pipeline_id: str
    status: str
    message: str = "Pipeline execution started"


class PipelineRunResponse(BaseModel):
    id: str
    pipeline_id: str
    pipeline: Optional[PipelineResponse] = None
    status: str
    metrics_json: Optional[dict] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PipelineRunListResponse(PaginatedApiResponse):
    data: list[PipelineRunResponse]


class AlertResponse(BaseModel):
    id: str
    anomaly_id: str
    channel: str
    sent_at: Optional[datetime] = None
    status: str
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class AlertCreate(BaseModel):
    anomaly_id: str
    channel: str = "email"


class AlertRuleResponse(BaseModel):
    id: str
    pipeline_id: str
    condition: str
    channels: Optional[list] = None
    enabled: bool = True

    model_config = {"from_attributes": True}
