# Architecture

## Hybrid Model: Agent + Cloud

Beacon follows a hybrid architecture with two main components:

| Component | Where It Runs | Responsibilities |
|---|---|---|
| **Local Agent** (Python) | Client infrastructure | Connect to databases, statistical profiling (sampling), learn baselines, detect anomalies (z-score), decide what to alert on. **Never uploads raw data** — only statistical summaries and schema metadata. |
| **Cloud** (FastAPI + React) | SaaS (beacon.app) | Centralized dashboard, anomaly history, alert dispatch (email), remote agent configuration, user authentication. |

**Data flow:**

1. Agent profiles locally → uploads statistical summary + schema metadata to cloud (HTTPS)
2. Agent detects anomaly locally → uploads alert event to cloud
3. Cloud persists, notifies (email), and displays on dashboard
4. User configures pipelines, thresholds, and schedules via dashboard → cloud sends config to agent

**Agent resilience:**

- Cloud monitors agent via heartbeat; if it goes down, waits for it to return
- If the client database is unavailable, the agent distinguishes this from a real anomaly — **never emits phantom alerts**
- If cloud is offline, agent stores alerts in a local queue and syncs when reconnected

---

## Cloud Architecture: Modular Monolith

The cloud backend has well-defined domains (connectors, pipelines, alerts, dashboard) that evolve at different speeds, but don't yet justify the operational complexity of microservices. The Modular Monolith enables a single deploy with isolated internal modules, making future extraction into independent services straightforward.

The local agent code (profiling, detection, database connectors) is a separate component that reuses the same Python stack as the cloud backend, but runs independently on client infrastructure. The module organization below refers only to the cloud backend.

---

## Layer Structure

### Backend

- **Domain Layer** — Core entities (DataSource, Pipeline, Anomaly, Alert) and pure business rules
- **Application Layer** — Use cases (RunPipeline, DetectAnomaly, SendAlert) and application services
- **Infrastructure Layer** — Database/spreadsheet connectors, email/Slack delivery, persistence
- **Presentation Layer** — FastAPI routes, REST controllers, auth middleware

### Frontend

- Feature-based organization — each feature (pipelines, alerts, datasources) is a directory with components, hooks, and types
- State: React Query for server state (cache, refetch, invalidation)
- Shared components in `src/components/ui/`

---

## Module Organization

```
app/
├── domain/                    # Business logic (independent of framework)
│   ├── models.py              # All SQLAlchemy ORM models + enums
│   └── schemas.py             # All Pydantic request/response schemas
├── application/               # Services, use cases
│   ├── agent_service.py
│   ├── datasource_service.py
│   ├── pipeline_service.py
│   ├── pipeline_runner.py     # Pipeline execution orchestrator (CloudProfiler + AnomalyDetector + AlertDispatcher)
│   ├── profiling.py           # CloudProfiler — wrapper for agent/profiling/runner.py
│   ├── detection.py           # CloudAnomalyDetector — wrapper for agent/detection.py
│   ├── alert_rule_service.py  # AlertRule CRUD with ownership verification
│   ├── anomaly_service.py
│   └── alert_dispatcher.py    # Evaluates AlertRules (threshold enforcement), dispatch via EmailNotifier
├── infrastructure/            # Database, connectors, external services
│   ├── database.py            # Async engine, session factory, get_db dependency
│   ├── crypto.py              # Fernet encrypt/decrypt for connection_config
│   ├── security.py            # Token generation (API keys, agent tokens), hashing
│   ├── notifiers/
│   │   └── email.py           # EmailNotifier (SendGrid SDK, HTML templates)
│   └── repositories/          # user, agent, agent_token, api_key, datasource, pipeline, etc.
├── presentation/              # Controllers, routes, HTTP handlers
│   ├── api/
│   │   ├── router.py          # Central router registration
│   │   ├── routes/            # agents, datasources, pipelines, anomalies, alert_rules, auth, api_keys, health
│   │   └── middleware/
│   │       └── auth.py        # require_auth: API Key → JWT → Agent Token (3 methods)
│   └── exceptions.py
└── shared/                    # Common utilities, config, exceptions
    └── config.py              # Pydantic-settings: DB, JWT, CORS, Fernet, SendGrid, Redis

agent/                         # Local agent (Python package — independent lifecycle)
├── pyproject.toml             # Agent's own dependencies + entry point (beacon-agent CLI)
├── cli.py                     # Click CLI: beacon-agent run --token --cloud-url --once
├── config.py                  # Pydantic-settings
├── api_client.py              # HTTP client for cloud API
├── heartbeat.py               # HeartbeatService: async loop, network resilience
├── storage.py                 # SQLite baseline storage + offline alert queue
├── detection.py               # AnomalyDetector: z-score evaluation, severity classification
├── connectors/
│   └── postgres.py            # PostgresConnector (asyncpg)
└── profiling/                 # SchemaProfiler, VolumeProfiler, NullCheckProfiler, ProfileRunner

frontend/
├── src/
│   ├── features/              # agents, anomalies, auth, datasources, pipelines
│   ├── pages/                 # DashboardPage, LandingPage
│   ├── components/
│   │   ├── layout/            # Shell, Sidebar, Header
│   │   └── ui/                # 23 shared UI components (Button, Input, Table, Modal, Tabs, etc.)
│   ├── hooks/                 # useAuth (context + provider)
│   ├── lib/                   # api.ts (typed endpoint functions + ApiEnvelope pattern)
│   └── types/                 # TypeScript types
├── tests/e2e/                 # Playwright E2E tests
└── playwright.config.ts
```

---

## Data Model

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| **User** | id, email, password_hash, name | has many Agent, has many ApiKey |
| **Agent** | id, name, user_id, status (online/offline), last_heartbeat_at | belongs to User, has many DataSource, has many AgentToken |
| **AgentToken** | id, agent_id, token_hash (SHA-256), token_prefix, last_used_at | belongs to Agent |
| **ApiKey** | id, user_id, key_hash (SHA-256), key_prefix, expires_at, revoked | belongs to User |
| **DataSource** | id, name, type (postgres/mysql/bigquery/google_sheets), agent_id, connection_config (JSONB, encrypted), status | belongs to Agent, has many Pipeline |
| **Pipeline** | id, name, type (volume/null_check/schema_change), data_source_id, schedule (cron), config (JSONB), enabled | belongs to DataSource, has many PipelineRun, has many AlertRule |
| **PipelineRun** | id, pipeline_id, status (success/warning/error), metrics_json | belongs to Pipeline, has many Anomaly |
| **Anomaly** | id, pipeline_run_id, severity (low/medium/high/critical), type, description, deviation_details (JSONB) | belongs to PipelineRun, has many Alert |
| **Alert** | id, anomaly_id, channel (email/slack), sent_at, status (sent/failed) | belongs to Anomaly |
| **AlertRule** | id, pipeline_id, metric (z_score/null_pct/volume_delta_pct), operator (gt/lt/gte/lte/eq), threshold (float), channels (JSONB), enabled | belongs to Pipeline |

All tables use UUID primary keys. Foreign keys indexed. Timestamps: `created_at`, `updated_at`. Naming: `snake_case` plural tables, `snake_case` columns.

---

## API Conventions

**Success Response:**

```json
{
  "data": { "...": "..." },
  "error": null
}
```

**Error Response:**

```json
{
  "data": null,
  "error": "error_code",
  "message": "Human readable description"
}
```

- **Rate Limiting:** 100 req/min per IP
- **Pagination:** offset-based, 50 items per page
- **Versioning:** URL prefix `/api/v1/`
- **Auth Methods:** JWT (dashboard users) + API Keys (connectors) + Agent Tokens (local agents)
- **Encryption:** Fernet symmetric for `connection_config` at rest
