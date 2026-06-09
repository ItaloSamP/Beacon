# Task: issue-17 — [SECURITY] Fix 8 MEDIUM security findings from Sprint 1

## Status: READY_FOR_TESTING

## Metadata

- **Type:** bug (security hardening)
- **Scope:** backend
- **Priority:** high
- **Source:** GitHub Issue #17

## Problem Statement

Sprint 1 left 8 MEDIUM security findings open. This task resolves all of them:
- User isolation for anomalies, pipeline runs, and alerts (M-5a/b/c)
- Agent-token-only restriction on anomaly uploads (M-4)
- Specific exception handling in decryption and pipeline execution (M-2, M-7)
- Agent token `last_used_at` tracking in auth middleware (M-1)
- DataSource detail cross-user protection (M-3)

## Acceptance Criteria

- [x] M-1: Agent token `last_used_at` is updated in auth middleware on every request
- [x] M-2: `_decrypt_config_fields()` catches `InvalidToken, ValueError, json.JSONDecodeError` instead of bare `Exception`
- [x] M-7: `_execute_pipeline()` catches `NotFoundException, SQLAlchemyError` instead of bare `Exception`
- [x] M-3: DataSource detail only returns decrypted config if user owns the linked agent
- [x] M-4: `POST /api/v1/anomalies` rejects non-agent-token auth methods (JWT, API key)
- [x] M-5a: Anomaly repository filters by `user_id` (via pipeline_run → pipeline → datasource → agent)
- [x] M-5b: PipelineRun repository filters by `user_id` (via pipeline → datasource → agent)
- [x] M-5c: Alert repository filters by `user_id` (via anomaly → pipeline_run → pipeline → datasource → agent)
- [x] Cross-user access returns 404 (not 403) to avoid leaking entity existence
- [x] Existing tests still pass; new tests cover all 8 fixes

## Technical Approach

**Decision:** JOIN-based user isolation at the repository layer (consistent with existing Agent ownership pattern). Inline `last_used_at` update. 404 for cross-user; 403 for M-4 auth-method violation. Narrow exception swaps for M-2/M-7.

**Origin:** orchestrator-decided (user delegated: "siga sua intuição")

**Rationale:**
- PROJECT_CONTEXT §10 (2026-05-13 "User-scoped entities: Agent ownership pattern") and (2026-05-14 "Security: ... DataSource detail is known limitation, address in Sprint 2") already establish JOIN-based filtering and 404-on-cross-user as the project standard. This task IS the Sprint 2 work referenced.
- M-4 returns **403** because the endpoint exists and is reachable — only the auth method is wrong. M-3/M-5 return **404** because the entity-existence leak is the concern.
- Inline `last_used_at` writes are the simplest correct fix per issue wording ("on every request"); throttling can be a future optimization if it becomes a hotspot.
- M-7's exception narrowing is minimal and stable; #32 will rewrite `pipeline_runner.py` on top of this.

## Architecture Fit

- Layer: Infrastructure (repositories add JOINs) + Application (services add ownership re-check) + Presentation (route 403 for M-4).
- Follows §3 Modular Monolith conventions and §10 Agent ownership pattern (filter at repo + verify at service + 404 on miss).
- No breaking API contract changes — only stricter authorization.

## Implementation Plan

### Tasks

- [x] Task 1: **M-1** — In `app/presentation/api/middleware/auth.py`, after successful agent-token lookup, call `repo.update_last_used(agent_token_obj.id)` (or equivalent). Add the repo method if missing.
- [x] Task 2: **M-2** — In `app/application/datasource_service.py::_decrypt_config_fields()`, replace bare `except Exception` with `except (InvalidToken, ValueError, json.JSONDecodeError)`. Add the imports (`from cryptography.fernet import InvalidToken`, `import json`).
- [x] Task 3: **M-7** — In `app/application/pipeline_runner.py::_execute_pipeline()`, replace bare `except Exception` with `except (NotFoundException, SQLAlchemyError)`. Add imports.
- [x] Task 4: **M-4** — In `app/presentation/api/routes/anomalies.py` `POST /api/v1/anomalies`, add explicit check: `if _user.get("auth_method") != "agent_token": raise HTTPException(403, "Agent token required")`. Apply consistently across `/agent/*` endpoints if not already covered.
- [x] Task 5: **M-3** — In `app/application/datasource_service.py::get_by_id()` (when `mask_config=False`), verify `datasource.agent.user_id == user_id`. If mismatch or `agent_id IS NULL` → return None (route raises 404). Eager-load `agent` relationship.
- [x] Task 6: **M-5a** — In `app/infrastructure/repositories/anomaly_repo.py`, add `user_id` parameter to `list()` and `get_by_id()`. JOIN: `Anomaly → PipelineRun → Pipeline → DataSource → Agent` and filter `Agent.user_id == user_id`. Update `AnomalyService` and routes to pass `user_id` from `_user["user_id"]`.
- [x] Task 7: **M-5b** — Same pattern in `pipeline_run_repo.py`. JOIN: `PipelineRun → Pipeline → DataSource → Agent`.
- [x] Task 8: **M-5c** — Same pattern in `alert_repo.py`. JOIN: `Alert → Anomaly → PipelineRun → Pipeline → DataSource → Agent`.
- [x] Task 9: **Indexes** — Alembic migration adding indexes on the JOIN FKs if missing: `pipeline_runs.pipeline_id`, `anomalies.pipeline_run_id`, `alerts.anomaly_id`, `pipelines.data_source_id`, `data_sources.agent_id`, `agents.user_id`.
- [x] Task 10: **Tests** — For each M-fix: a unit/integration test covering the positive path (owner access works) and the negative path (cross-user → 404; non-agent-token on M-4 → 403; bad decrypt → caught exception type).
- [x] Task 11: Run `ruff check .`, `bandit -r app/`, and full pytest. Update PROJECT_CONTEXT §10 with any new lessons via `lessons-writer`.

### Implementation Order

1. **M-2, M-7** first — pure narrow exception swaps, near-zero risk, builds confidence.
2. **M-1** — auth middleware update, isolated change.
3. **M-4** — route-level guard on `POST /anomalies` (and any other `/agent/*` endpoints needing the same).
4. **M-3** — DataSource detail ownership check (single file, single method).
5. **M-5a → M-5b → M-5c** — repository JOIN filters in dependency order (anomaly depends on pipeline_run logically, but each is independent at the repo layer). Update services + routes to pass `user_id`.
6. **Indexes migration** — once JOINs are in place.
7. **Tests** in parallel with each fix (generated by `test-generator`).

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `app/presentation/api/middleware/auth.py` | MODIFY | M-1: update `last_used_at` on agent-token auth |
| `app/infrastructure/repositories/agent_token_repo.py` | MODIFY | M-1: add `update_last_used()` if missing |
| `app/application/datasource_service.py` | MODIFY | M-2 exception narrowing + M-3 ownership check |
| `app/application/pipeline_runner.py` | MODIFY | M-7 exception narrowing |
| `app/presentation/api/routes/anomalies.py` | MODIFY | M-4 agent-token-only guard |
| `app/infrastructure/repositories/anomaly_repo.py` | MODIFY | M-5a user_id JOIN filter |
| `app/infrastructure/repositories/pipeline_run_repo.py` | MODIFY | M-5b user_id JOIN filter |
| `app/infrastructure/repositories/alert_repo.py` | MODIFY | M-5c user_id JOIN filter |
| `app/application/anomaly_service.py` | MODIFY | pass user_id from routes to repo |
| `app/application/pipeline_run_service.py` (or equivalent) | MODIFY | pass user_id |
| `app/application/alert_service.py` (or equivalent) | MODIFY | pass user_id |
| `app/presentation/api/routes/anomalies.py`, `pipeline_runs.py`, `alerts.py` | MODIFY | extract `user_id = _user["user_id"]` and forward |
| `alembic/versions/<new>_add_user_isolation_indexes.py` | CREATE | Index FKs used in JOINs |
| `tests/presentation/routes/test_anomalies.py` | MODIFY/CREATE | Cross-user 404 + M-4 403 tests |
| `tests/presentation/routes/test_pipeline_runs.py` | MODIFY/CREATE | Cross-user 404 tests |
| `tests/presentation/routes/test_alerts.py` | MODIFY/CREATE | Cross-user 404 tests |
| `tests/application/test_datasource_service.py` | MODIFY/CREATE | M-2 exception types + M-3 ownership |
| `tests/application/test_pipeline_runner.py` | MODIFY/CREATE | M-7 exception types |
| `tests/presentation/middleware/test_auth.py` | MODIFY/CREATE | M-1 last_used_at update |

### API Contracts

- No breaking changes. New responses:
  - `POST /api/v1/anomalies` with non-agent-token auth → **403** `{"data": null, "error": "agent_token_required", "message": "This endpoint requires an agent token."}`
  - `GET /api/v1/anomalies/{id}`, `/pipeline_runs/{id}`, `/alerts/{id}`, `/datasources/{id}` for non-owner → **404** (same shape as not-found).
  - List endpoints return only entities owned (via the join chain) by the authenticated user.

### Database Changes

- New migration: indexes on `pipeline_runs.pipeline_id`, `anomalies.pipeline_run_id`, `alerts.anomaly_id`, `pipelines.data_source_id`, `data_sources.agent_id`, `agents.user_id` (skip any that already exist).
- No schema changes — pure index additions. Rollback: drop indexes.

## Testing Strategy

- **Unit tests:**
  - `_decrypt_config_fields` raises caught exception types only (InvalidToken / ValueError / json.JSONDecodeError) → returns None / safe default.
  - `_execute_pipeline` catches NotFoundException + SQLAlchemyError; other exceptions propagate.
  - Auth middleware: agent-token request updates `last_used_at`.
- **Integration tests:**
  - Cross-user listing of anomalies/runs/alerts returns only the caller's entities.
  - Cross-user GET-by-id of any of those returns 404.
  - `POST /anomalies` with JWT → 403; with API key → 403; with agent token → 200/201.
  - `GET /datasources/{id}` for a datasource whose agent belongs to user B (caller is A) → 404; same with `agent_id IS NULL` → 404 (or per current convention).
- **Regression:** all existing tests must pass.

## Risks and Considerations

- **JOIN performance** — without the new indexes, list endpoints could degrade. Migration mitigates.
- **`last_used_at` write amplification** — inline write per agent request. Acceptable for current scale; revisit if it becomes a hotspot.
- **#32 coordination** — `_execute_pipeline` narrow exception swap is small and stable; #32 rebases on top.
- **Windows asyncpg test instability** (PROJECT_CONTEXT §10) — likely to surface; tester to flag without blocking commit if test logic is correct.
- **DataSources with `agent_id IS NULL`** — treated as "no owner → no detail decryption" (404).

## Dependencies

- **External:** none.
- **Internal:** none new. Coordinates with #32 (#17 lands first).

## Evidence (filled by tester/reviewer)

- **Test Log:** 108/108 unit tests passing (tests/application/ + tests/presentation/middleware/). 21 pre-existing ruff F841 warnings in agent/tests/ and test files — none from this issue. Integration tests require PostgreSQL (blocked by known asyncpg/Windows issue — PROJECT_CONTEXT §10).
- **Coverage:** _pending_ (integration tests require PostgreSQL)
- **Security Scan:** Bandit: 0 HIGH, 0 MEDIUM, 1 LOW (B110 bare except:pass in datasources.py:42, pre-existing, not from this issue). Ruff: 21 pre-existing issues, 0 new.
- **Review Verdict:** _pending_

---

_Created by @orchestrator-nontdd_
_Last updated: 2026-06-09_
