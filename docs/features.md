# Features

## v1 — Implemented

| Feature | Description |
|---------|-------------|
| **Local Agent** | Install via `beacon-agent run --token`, binds to cloud with `beacon_agent_xxx` token |
| **PostgreSQL Profiling** | Automatic schema scan, row count, null percentage on connect |
| **SQLite Baseline Storage** | Local statistical baselines and offline alert queue |
| **Z-Score Anomaly Detection** | Automatically learns historical baseline, detects deviations |
| **Cloud Pipeline Execution** | Manual trigger, anomaly persistence, alert dispatch |
| **Email Alerts (SendGrid)** | HTML template with evidence, baseline vs current, z-score, recommendation |
| **Cloud Dashboard** | Data source status, anomaly feed, pipeline run queue |
| **Remote Configuration** | Pipelines, schedules, thresholds via dashboard — agent pulls from `GET /agent/self/config` |
| **Agent Resilience** | Heartbeat monitoring, offline buffer, never emits phantom alerts |
| **Agent Token Auth** | Cloud-generated, one-time reveal, individually revocable |
| **Connection Config Encryption** | Fernet symmetric encryption at rest |
| **23 UI Components** | Design system with TailwindCSS v4 `@theme` tokens |
| **CI/CD** | GitHub Actions for backend, frontend, agent — Ruff, Mypy, Pytest, Vitest, build |
| **E2E Tests** | Playwright — 6 specs, 17 tests covering auth, dashboard, pipeline CRUD, anomalies |
| **Docker Compose** | Full dev environment — PostgreSQL, Redis, Backend, Frontend, Agent |

## Sprint 2 — Implemented

| Feature | Description |
|---------|-------------|
| **AlertRules CRUD** | Structured fields (metric, operator, threshold), REST routes under `/pipelines/{id}/rules` |
| **PipelineRunner** | Real implementation — cloud profiling + anomaly detection + alert dispatch |
| **AlertDispatcher** | Threshold enforcement — only dispatches alert if rule threshold is met |
| **CloudProfiler + CloudAnomalyDetector** | Cloud wrappers in `app/application/` for agent profiling and detection |
| **SendGrid Integration** | Replaced stub EmailNotifier with real SendGrid SDK |
| **Auth Me Endpoint** | `GET /auth/me` for session verification |
| **DataSources Health** | `GET /datasources/health` — counts by status (healthy, warning, error, offline) |
| **Global JSON Error Handler** | 3 exception handlers — AppException, RequestValidationError, Exception |
| **7 Security Fixes** | User isolation via ownership chain, bare except removals, last_used_at tracking, agent-token restriction, schema validation |
| **Codecov Integration** | 3 flags (backend, frontend, agent), 80% target |
| **Docker Build & Push CI** | ghcr.io registry, 3 images (backend, frontend, agent) |
| **E2E CI Pipeline** | Playwright in CI, auto-issue on failure |
| **5 GitHub Actions Workflows** | backend, frontend, agent, docker-build, e2e |

## Planned

| Feature | Status |
|---------|--------|
| MySQL, BigQuery, Google Sheets support | Planned |
| Slack alert channel | Planned |
| Advanced statistical methods (IQR, moving averages) | Planned |
| Automatic pipeline scheduling (cron) | Planned |
| Multi-member workspaces with roles (Owner, Editor, Viewer) | Planned |
| Weekly automated report | Planned |
| Agent daemon mode (currently CLI foreground only) | Planned |
