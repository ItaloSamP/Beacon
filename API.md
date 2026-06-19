# API Context — Beacon

> **Base URL:** `http://localhost:8000/api/v1` (local) / `https://beacon.app/api/v1` (prod)
> **Protocol:** REST (JSON)
> **Last Updated:** 2026-06-19

## 1. Authentication

- **Methods:** JWT (dashboard users) + API Keys (external connectors) + Agent Tokens (local agents)
- **Priority Order:** API Key (`X-API-Key` header) → JWT (`Authorization: Bearer <jwt>`) → Agent Token (`Authorization: Bearer <agent_token>`)
- **JWT Token:** `POST /api/v1/auth/login` — access 15min, refresh 7 days
- **API Key Format:** `bcn_` prefix + 48 random chars, SHA-256 hashed, one-time reveal
- **Agent Token Format:** `beacon_agent_` prefix + 48 random chars, SHA-256 hashed, one-time reveal on agent creation

### Auth Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login, returns JWT pair | No |
| GET | `/auth/me` | Get current user session | JWT |
| POST | `/auth/refresh` | Refresh access token | No (uses refresh token) |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |

## 2. Endpoints

### Health

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/health` | Health check (DB + Redis) | No |

### Agents

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/agents` | List user's agents | JWT |
| GET | `/agents/{id}` | Get agent detail | JWT |
| POST | `/agents` | Create agent (returns one-time token) | JWT |
| PUT | `/agents/{id}` | Update agent | JWT |
| DELETE | `/agents/{id}` | Delete agent | JWT |
| GET | `/agents/{id}/tokens` | List tokens (prefix only) | JWT |
| DELETE | `/agents/{id}/tokens/{token_id}` | Revoke token | JWT |

### Agent Self (Agent-side endpoints)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/agent/self/config` | Get agent config (datasources + pipelines) | Agent Token |
| POST | `/agent/self/heartbeat` | Send heartbeat | Agent Token |
| POST | `/agent/self/anomalies` | Upload detected anomaly | Agent Token |

### Data Sources

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/datasources` | List datasources (paginated) | JWT / API Key |
| GET | `/datasources/health` | Health summary (healthy, warning, error, offline counts) | JWT |
| GET | `/datasources/{id}` | Get datasource detail (decrypted config) | JWT |
| POST | `/datasources` | Create datasource | JWT |
| PUT | `/datasources/{id}` | Update datasource | JWT |
| DELETE | `/datasources/{id}` | Delete datasource | JWT |

### Pipelines

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/pipelines` | List pipelines | JWT |
| GET | `/pipelines/{id}` | Get pipeline detail | JWT |
| POST | `/pipelines` | Create pipeline | JWT |
| PUT | `/pipelines/{id}` | Update pipeline | JWT |
| DELETE | `/pipelines/{id}` | Delete pipeline | JWT |
| POST | `/pipelines/{id}/run` | Trigger pipeline execution (async) | JWT |
| POST | `/pipelines/{id}/toggle` | Toggle pipeline enabled/disabled | JWT |

### Alert Rules (nested under pipelines)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/pipelines/{id}/rules` | List rules for pipeline | JWT |
| POST | `/pipelines/{id}/rules` | Create alert rule | JWT |
| GET | `/pipelines/{id}/rules/{rule_id}` | Get alert rule detail | JWT |
| PUT | `/pipelines/{id}/rules/{rule_id}` | Update alert rule | JWT |
| DELETE | `/pipelines/{id}/rules/{rule_id}` | Delete alert rule | JWT |

**AlertRule fields:**
- `metric` (string, required): `"z_score"`, `"null_pct"`, `"volume_delta_pct"`
- `operator` (string, required): `"gt"`, `"lt"`, `"gte"`, `"lte"`, `"eq"`
- `threshold` (float, required): valor numérico do threshold
- `channels` (string array, default `[]`): canais de notificação (ex: `["email"]`)
- `enabled` (boolean, default `true`)

### Pipeline Runs

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/pipeline-runs` | List pipeline runs | JWT |
| GET | `/pipeline-runs/recent` | Recent pipeline runs (with `?limit=`) | JWT |
| GET | `/pipeline-runs/{id}` | Get pipeline run detail | JWT |

### Anomalies

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/anomalies` | List anomalies (paginated) | JWT |
| GET | `/anomalies/recent` | Recent anomalies (with `?limit=`) | JWT |
| GET | `/anomalies/{id}` | Get anomaly detail | JWT |
| POST | `/anomalies` | Create anomaly (agent upload) | Agent Token |

### API Keys

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api-keys` | List API keys (prefix only) | JWT |
| POST | `/api-keys` | Create API key (one-time full key reveal) | JWT |
| DELETE | `/api-keys/{id}` | Revoke API key | JWT |

### Alerts

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/alerts` | List alerts | JWT |
| GET | `/alerts/{id}` | Get alert detail | JWT |

## 3. Response Conventions

**Success (single item):**
```json
{
  "data": { "id": "...", "name": "...", ... },
  "error": null
}
```

**Success (list):**
```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 50, "total": 100 },
  "error": null
}
```

**Error:**
```json
{
  "data": null,
  "error": "error_code",
  "message": "Human readable description"
}
```

**Validation Error (422):**
```json
{
  "data": null,
  "error": "validation_error",
  "message": "field1: error1; field2: error2",
  "detail": [...]
}
```

## 4. Error Codes

| Status | Code | When |
|--------|------|------|
| 400 | `bad_request` | Malformed request |
| 401 | `unauthorized` | Invalid/missing token |
| 403 | `forbidden` | Insufficient permissions |
| 404 | `not_found` | Resource missing (also used for cross-user access) |
| 409 | `conflict` | Duplicate resource |
| 422 | `validation_error` | Business rule / schema violation |
| 429 | `rate_limited` | Too many requests |
| 500 | `internal_error` | Server failure |

## 5. Pagination

- **Strategy:** Offset-based
- **Default limit:** 50 items per page
- **Max limit:** 100
- **Parameters:** `?page=1&limit=50`

## 6. Rate Limiting

- **General:** 100 req/min per IP
- **API Key:** 1000 req/min per key
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

*Generated by context-generator on 2026-06-19*
