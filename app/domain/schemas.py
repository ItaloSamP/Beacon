from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from app.domain.models import (
    AgentStatus,
    DataSourceStatus,
    DataSourceType,
    PipelineType,
)


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
    agent_id: UUID | None = None
    connection_config: dict = {}
    status: DataSourceStatus = DataSourceStatus.active

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v


class DataSourceUpdate(BaseModel):
    name: str | None = None
    type: DataSourceType | None = None
    agent_id: UUID | None = None
    connection_config: dict | None = None
    status: DataSourceStatus | None = None


class DataSourceResponse(BaseModel):
    id: str
    name: str
    type: str
    agent_id: str | None = None
    agent: dict | None = None
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
    schedule: str | None = None
    config: dict = {}
    enabled: bool = True

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v


class PipelineUpdate(BaseModel):
    name: str | None = None
    type: PipelineType | None = None
    schedule: str | None = None
    config: dict | None = None
    enabled: bool | None = None


class PipelineResponse(BaseModel):
    id: str
    name: str
    type: str
    data_source_id: str
    schedule: str | None = None
    config: dict
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PipelineDetailResponse(PipelineResponse):
    data_source: DataSourceNested | None = None


class ApiKeyCreate(BaseModel):
    name: str
    expires_at: datetime | None = None

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
    expires_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyListResponse(BaseModel):
    id: str
    name: str
    prefix: str
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    revoked: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentCreate(BaseModel):
    name: str
    status: AgentStatus = AgentStatus.offline
    version: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("name must not be empty")
        return v


class AgentUpdate(BaseModel):
    name: str | None = None
    status: AgentStatus | None = None
    version: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and (not v or not v.strip()):
            raise ValueError("name must not be empty")
        return v


class AgentResponse(BaseModel):
    id: str
    name: str
    status: str
    user_id: str
    last_heartbeat_at: datetime | None = None
    version: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentTokenResponse(BaseModel):
    id: str
    token_prefix: str
    name: str
    last_used_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AnomalyCreate(BaseModel):
    pipeline_run_id: str
    type: str
    severity: str
    description: str | None = None
    deviation_details: dict | None = None


class AnomalyResponse(BaseModel):
    id: str
    pipeline_run_id: str
    severity: str
    type: str
    description: str | None = None
    deviation_details: dict | None = None
    detected_at: datetime | None = None
    resolved_at: datetime | None = None

    model_config = {"from_attributes": True}


class PipelineRunTriggerResponse(BaseModel):
    run_id: str
    pipeline_id: str
    status: str
    message: str = "Pipeline execution started"


class PipelineRunResponse(BaseModel):
    id: str
    pipeline_id: str
    pipeline: PipelineResponse | None = None
    status: str
    metrics_json: dict | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None

    model_config = {"from_attributes": True}


class PipelineRunListResponse(PaginatedApiResponse):
    data: list[PipelineRunResponse]


class AlertResponse(BaseModel):
    id: str
    anomaly_id: str
    channel: str
    sent_at: datetime | None = None
    status: str
    error_message: str | None = None

    model_config = {"from_attributes": True}


class AlertCreate(BaseModel):
    anomaly_id: str
    channel: str = "email"


# Valid metrics and operators for alert rules
_ALERT_METRICS = {"z_score", "null_pct", "volume_delta_pct"}
_ALERT_OPERATORS = {"gt", "lt", "gte", "lte", "eq"}


class AlertRuleCreate(BaseModel):
    metric: str
    operator: str
    threshold: float
    channels: list[str] | None = None
    enabled: bool = True

    @field_validator("metric")
    @classmethod
    def metric_must_be_valid(cls, v: str) -> str:
        if v not in _ALERT_METRICS:
            raise ValueError(
                f"metric must be one of: {', '.join(sorted(_ALERT_METRICS))}"
            )
        return v

    @field_validator("operator")
    @classmethod
    def operator_must_be_valid(cls, v: str) -> str:
        if v not in _ALERT_OPERATORS:
            raise ValueError(
                f"operator must be one of: {', '.join(sorted(_ALERT_OPERATORS))}"
            )
        return v

    @field_validator("threshold")
    @classmethod
    def threshold_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("threshold must be a positive number")
        return v


class AlertRuleUpdate(BaseModel):
    metric: str | None = None
    operator: str | None = None
    threshold: float | None = None
    channels: list[str] | None = None
    enabled: bool | None = None

    @field_validator("metric")
    @classmethod
    def metric_must_be_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in _ALERT_METRICS:
            raise ValueError(
                f"metric must be one of: {', '.join(sorted(_ALERT_METRICS))}"
            )
        return v

    @field_validator("operator")
    @classmethod
    def operator_must_be_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in _ALERT_OPERATORS:
            raise ValueError(
                f"operator must be one of: {', '.join(sorted(_ALERT_OPERATORS))}"
            )
        return v

    @field_validator("threshold")
    @classmethod
    def threshold_must_be_positive(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("threshold must be a positive number")
        return v


class AlertRuleResponse(BaseModel):
    id: str
    pipeline_id: str
    metric: str
    operator: str
    threshold: float
    channels: list
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
