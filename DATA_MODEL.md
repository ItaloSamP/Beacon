# Data Model — Beacon

> **Database:** PostgreSQL 16
> **ORM:** SQLAlchemy 2.0 (async, `async_sessionmaker`)
> **Migrations:** Alembic (5 versions: initial, agents, tokens, indexes, alert_rules)
> **Last Updated:** 2026-06-19

## 1. Entity Overview

O Beacon possui 10 entidades core organizadas em cadeias de ownership:

```
User ──owns──▶ Agent ──owns──▶ DataSource ──owns──▶ Pipeline ──owns──▶ AlertRule
                                    │                       │
                                    │                       ├──owns──▶ PipelineRun ──owns──▶ Anomaly ──owns──▶ Alert
                                    │
                            AgentToken                      ApiKey (pertence ao User)
```

## 2. Entities

### User
**Table:** `users`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, auto (`uuid.uuid4`) | Primary key |
| `email` | `String(255)` | UNIQUE, NOT NULL | Login email |
| `password_hash` | `String(255)` | NOT NULL | bcrypt hash |
| `name` | `String(255)` | NOT NULL | Display name |
| `created_at` | `DateTime(tz)` | NOT NULL, `utcnow` | Created timestamp |
| `updated_at` | `DateTime(tz)` | NOT NULL, auto | Modified timestamp |

**Relationships:** has many `Agent`, has many `ApiKey`
**Indexes:** `(email)` UNIQUE

---

### Agent
**Table:** `agents`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, auto | Primary key |
| `name` | `String(255)` | NOT NULL | Agent display name |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL | Owner |
| `status` | `String(20)` | NOT NULL, default `"offline"` | `online` / `offline` |
| `last_heartbeat_at` | `DateTime(tz)` | nullable | Last heartbeat |
| `version` | `String(20)` | nullable | Agent version |
| `created_at` | `DateTime(tz)` | NOT NULL, `utcnow` | Created timestamp |
| `updated_at` | `DateTime(tz)` | NOT NULL, auto | Modified timestamp |

**Relationships:** belongs to `User`, has many `DataSource`, has many `AgentToken`
**Indexes:** `(user_id)`, `(status)`
**Business Rules:** User-scoped — user A cannot access user B's agents (returns 404)

---

### AgentToken
**Table:** `agent_tokens`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, auto | Primary key |
| `agent_id` | `UUID` | FK → `agents.id`, CASCADE, NOT NULL | Agent |
| `token_hash` | `String(64)` | UNIQUE, NOT NULL | SHA-256 hash of full token |
| `token_prefix` | `String(20)` | NOT NULL | `beacon_agent_` prefix |
| `name` | `String(255)` | NOT NULL | Token label |
| `last_used_at` | `DateTime(tz)` | nullable | Last authentication use |
| `created_at` | `DateTime(tz)` | NOT NULL, `utcnow` | Created timestamp |

**Relationships:** belongs to `Agent`
**Business Rules:** Full token revealed once on creation. Listing shows prefix only. Hard delete on revoke.

---

### ApiKey
**Table:** `api_keys`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, auto | Primary key |
| `user_id` | `UUID` | FK → `users.id`, NOT NULL | Owner |
| `key_hash` | `String(64)` | UNIQUE, NOT NULL | SHA-256 hash |
| `key_prefix` | `String(10)` | NOT NULL | `bcn_` prefix |
| `name` | `String(255)` | NOT NULL | Key label |
| `last_used_at` | `DateTime(tz)` | nullable | Last use |
| `expires_at` | `DateTime(tz)` | nullable | Expiration |
| `revoked` | `Boolean` | NOT NULL, default `False` | Revoked flag |
| `created_at` | `DateTime(tz)` | NOT NULL, `utcnow` | Created timestamp |

**Relationships:** belongs to `User`
**Business Rules:** One-time reveal on creation. Soft revoke via `revoked` flag.

---

### DataSource
**Table:** `data_sources`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, auto | Primary key |
| `name` | `String(255)` | NOT NULL | Display name |
| `type` | `String(50)` | NOT NULL | `postgres` / `mysql` / `bigquery` / `google_sheets` |
| `agent_id` | `UUID` | FK → `agents.id`, nullable | Connected agent |
| `connection_config` | `JSONB` | NOT NULL | Encrypted at rest via Fernet |
| `status` | `String(20)` | NOT NULL, default `"unknown"` | `healthy` / `warning` / `error` / `unknown` |
| `created_at` | `DateTime(tz)` | NOT NULL, `utcnow` | Created timestamp |
| `updated_at` | `DateTime(tz)` | NOT NULL, auto | Modified timestamp |

**Relationships:** belongs to `Agent`, has many `Pipeline`
**Indexes:** `(agent_id)`, `(status)`, `(type)`
**Business Rules:** `connection_config` is encrypted as `{"_encrypted": "<base64>"}` via Fernet. Decrypted only on detail view + agent self-config. Masked as `"****"` on list responses.

---

### Pipeline
**Table:** `pipelines`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, auto | Primary key |
| `name` | `String(255)` | NOT NULL | Display name |
| `type` | `String(50)` | NOT NULL | `volume` / `null_check` / `schema_change` |
| `data_source_id` | `UUID` | FK → `data_sources.id`, CASCADE, NOT NULL | Data source |
| `schedule` | `String(50)` | nullable | Cron expression |
| `config` | `JSONB` | NOT NULL, default `{}` | Pipeline config (target_tables, thresholds) |
| `enabled` | `Boolean` | NOT NULL, default `True` | Enabled state |
| `created_at` | `DateTime(tz)` | NOT NULL, `utcnow` | Created timestamp |
| `updated_at` | `DateTime(tz)` | NOT NULL, auto | Modified timestamp |

**Relationships:** belongs to `DataSource`, has many `PipelineRun`, has many `AlertRule`
**Indexes:** `(data_source_id)`, `(enabled)`

---

### AlertRule
**Table:** `alert_rules`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, auto | Primary key |
| `pipeline_id` | `UUID` | FK → `pipelines.id`, CASCADE, NOT NULL | Pipeline |
| `metric` | `String(50)` | NOT NULL | `z_score` / `null_pct` / `volume_delta_pct` |
| `operator` | `String(10)` | NOT NULL | `gt` / `lt` / `gte` / `lte` / `eq` |
| `threshold` | `Float` | NOT NULL | Numeric threshold value |
| `channels` | `JSONB` | NOT NULL, default `[]` | Notification channels array |
| `enabled` | `Boolean` | NOT NULL, default `True` | Enabled state |
| `created_at` | `DateTime(tz)` | NOT NULL, `utcnow` | Created timestamp |
| `updated_at` | `DateTime(tz)` | NOT NULL, auto | Modified timestamp |

**Relationships:** belongs to `Pipeline`
**Indexes:** `(pipeline_id)`, `(enabled)`
**Business Rules:** Refatorado no Sprint 2 de campo `condition` (string) para campos estruturados. AlertDispatcher avalia regras: alerta só é disparado se pelo menos uma regra ativa for satisfeita.

---

### PipelineRun
**Table:** `pipeline_runs`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, auto | Primary key |
| `pipeline_id` | `UUID` | FK → `pipelines.id`, CASCADE, NOT NULL | Pipeline |
| `status` | `String(20)` | NOT NULL, default `"running"` | `success` / `warning` / `error` |
| `metrics_json` | `JSONB` | nullable | Profiling metrics |
| `started_at` | `DateTime(tz)` | NOT NULL, `utcnow` | Start timestamp |
| `finished_at` | `DateTime(tz)` | nullable | Finish timestamp |

**Relationships:** belongs to `Pipeline`, has many `Anomaly`
**Indexes:** `(pipeline_id)`, `(status)`, `(started_at)`

---

### Anomaly
**Table:** `anomalies`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, auto | Primary key |
| `pipeline_run_id` | `UUID` | FK → `pipeline_runs.id`, CASCADE, NOT NULL | Pipeline run |
| `severity` | `String(20)` | NOT NULL | `low` / `medium` / `high` / `critical` |
| `type` | `String(50)` | NOT NULL | Anomaly type |
| `description` | `Text` | nullable | Human description |
| `deviation_details` | `JSONB` | nullable | Deviation data (z-score, baseline, atual) |
| `detected_at` | `DateTime(tz)` | NOT NULL, `utcnow` | Detection timestamp |
| `resolved_at` | `DateTime(tz)` | nullable | Resolution timestamp |

**Relationships:** belongs to `PipelineRun`, has many `Alert`
**Indexes:** `(pipeline_run_id)`, `(severity)`, `(detected_at)`

---

### Alert
**Table:** `alerts`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, auto | Primary key |
| `anomaly_id` | `UUID` | FK → `anomalies.id`, CASCADE, NOT NULL | Anomaly |
| `channel` | `String(20)` | NOT NULL | `email` / `slack` |
| `sent_at` | `DateTime(tz)` | nullable | Sent timestamp |
| `status` | `String(20)` | NOT NULL, default `"pending"` | `sent` / `failed` |
| `error_message` | `Text` | nullable | Error if failed |

**Relationships:** belongs to `Anomaly`
**Indexes:** `(anomaly_id)`, `(status)`

## 3. Relationships Summary

| From | Type | To | Via |
|------|------|----|-----|
| User | has_many | Agent | `user_id` |
| User | has_many | ApiKey | `user_id` |
| Agent | belongs_to | User | `user_id` |
| Agent | has_many | DataSource | `agent_id` |
| Agent | has_many | AgentToken | `agent_id` |
| DataSource | belongs_to | Agent | `agent_id` |
| DataSource | has_many | Pipeline | `data_source_id` |
| Pipeline | belongs_to | DataSource | `data_source_id` |
| Pipeline | has_many | PipelineRun | `pipeline_id` |
| Pipeline | has_many | AlertRule | `pipeline_id` |
| PipelineRun | belongs_to | Pipeline | `pipeline_id` |
| PipelineRun | has_many | Anomaly | `pipeline_run_id` |
| Anomaly | belongs_to | PipelineRun | `pipeline_run_id` |
| Anomaly | has_many | Alert | `anomaly_id` |
| Alert | belongs_to | Anomaly | `anomaly_id` |
| AlertRule | belongs_to | Pipeline | `pipeline_id` |

## 4. Soft Deletes

- **Strategy:** Hard delete (CASCADE onde aplicável)
- AgentTokens: DELETE direto (hard delete)
- ApiKeys: Soft revoke via `revoked` boolean

## 5. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Tables | `snake_case` plural | `data_sources`, `pipeline_runs` |
| Columns | `snake_case` | `last_heartbeat_at` |
| Foreign Keys | `<table>_id` | `pipeline_id` |
| Timestamps | `created_at`, `updated_at` | — |
| Primary Keys | `id` (UUIDv4) | — |

## 6. Migration Notes

- **Tool:** Alembic
- **Migrations:** 5 versions in `alembic/versions/`
  1. Initial schema (users, datasources, pipelines, etc.)
  2. Agents + agent_tokens
  3. Additional indexes
  4. AlertRules with structured fields (Sprint 2)
  5. Additional performance indexes
- Add columns nullable first. Never drop + add in same migration.
- Every schema change requires a new Alembic revision.

---

*Generated by context-generator on 2026-06-19*
