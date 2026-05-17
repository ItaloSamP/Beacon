import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.infrastructure.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class AgentStatus(str, enum.Enum):
    online = "online"
    offline = "offline"


class DataSourceType(str, enum.Enum):
    postgres = "postgres"
    mysql = "mysql"
    bigquery = "bigquery"
    google_sheets = "google_sheets"


class DataSourceStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    error = "error"


class PipelineType(str, enum.Enum):
    volume = "volume"
    null_check = "null_check"
    schema_change = "schema_change"


class PipelineRunStatus(str, enum.Enum):
    success = "success"
    warning = "warning"
    error = "error"


class AnomalySeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class AlertChannel(str, enum.Enum):
    email = "email"
    slack = "slack"


class AlertStatus(str, enum.Enum):
    sent = "sent"
    failed = "failed"


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    agents = relationship("Agent", back_populates="user", cascade="all, delete-orphan")


class Agent(Base):
    __tablename__ = "agents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(SAEnum(AgentStatus), default=AgentStatus.offline, nullable=False)
    last_heartbeat_at = Column(DateTime(timezone=True), nullable=True)
    version = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    user = relationship("User", back_populates="agents")
    data_sources = relationship("DataSource", back_populates="agent")
    tokens = relationship("AgentToken", back_populates="agent", cascade="all, delete-orphan")


class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(SAEnum(DataSourceType), nullable=False)
    # TODO: Make agent_id NOT NULL in Sprint 1
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"), nullable=True)
    connection_config = Column(JSONB, default=dict, nullable=False)
    status = Column(SAEnum(DataSourceStatus), default=DataSourceStatus.active, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    agent = relationship("Agent", back_populates="data_sources")
    pipelines = relationship("Pipeline", back_populates="data_source", cascade="all, delete-orphan")


class Pipeline(Base):
    __tablename__ = "pipelines"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    type = Column(SAEnum(PipelineType), nullable=False)
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id", ondelete="CASCADE"), nullable=False)
    schedule = Column(String(100), nullable=True)
    config = Column(JSONB, default=dict, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    data_source = relationship("DataSource", back_populates="pipelines")
    pipeline_runs = relationship("PipelineRun", back_populates="pipeline", cascade="all, delete-orphan")


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False)
    status = Column(SAEnum(PipelineRunStatus), nullable=False, default=PipelineRunStatus.success)
    metrics_json = Column(JSONB, default=dict, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    pipeline = relationship("Pipeline", back_populates="pipeline_runs")


class Anomaly(Base):
    __tablename__ = "anomalies"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_run_id = Column(UUID(as_uuid=True), ForeignKey("pipeline_runs.id", ondelete="CASCADE"), nullable=False)
    severity = Column(SAEnum(AnomalySeverity), nullable=False)
    type = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    deviation_details = Column(JSONB, default=dict, nullable=True)
    detected_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    pipeline_run = relationship("PipelineRun")


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    anomaly_id = Column(UUID(as_uuid=True), ForeignKey("anomalies.id", ondelete="CASCADE"), nullable=False)
    channel = Column(SAEnum(AlertChannel), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(SAEnum(AlertStatus), nullable=False, default=AlertStatus.sent)
    error_message = Column(String(500), nullable=True)


class AlertRule(Base):
    __tablename__ = "alert_rules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id = Column(UUID(as_uuid=True), ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False)
    condition = Column(String(500), nullable=False)
    channels = Column(JSONB, default=list, nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class AgentToken(Base):
    __tablename__ = "agent_tokens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True)
    token_prefix = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False, default="Default")
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    agent = relationship("Agent", back_populates="tokens")


class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    prefix = Column(String(50), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
