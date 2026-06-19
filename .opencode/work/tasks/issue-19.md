# Task: issue-19 — AlertRules CRUD and AlertDispatcher Wiring

## Status: READY_TO_COMMIT

## Metadata
- **Type:** feature
- **Scope:** backend
- **Priority:** high
- **Source:** GitHub Issue #19
- **Labels:** feature, backend, priority:high

## Problem Statement
The AlertRule model exists in the ORM with a legacy `condition` (free-text string) field but has zero implementation. AlertDispatcher ignores `alert_rules` entirely — every anomaly generates an alert regardless of severity. This issue: (1) refactors `condition` into structured fields (`metric`, `operator`, `threshold`), (2) creates the full backend CRUD stack for AlertRules (repository, service, routes), and (3) updates AlertDispatcher to filter by rule thresholds.

## Acceptance Criteria
- [ ] Migration: drops `condition` column, adds `metric`, `operator`, `threshold` columns
- [ ] `AlertRuleCreate` and `AlertRuleUpdate` Pydantic schemas with field validation
- [ ] `AlertRuleRepository` with CRUD + `list_by_pipeline()` + `list_active_by_pipeline()`
- [ ] `AlertRuleService` with CRUD + metric/operator validation
- [ ] `GET/POST /api/v1/pipelines/{id}/rules` endpoints
- [ ] `PUT /api/v1/pipelines/{id}/rules/{rule_id}`
- [ ] `DELETE /api/v1/pipelines/{id}/rules/{rule_id}` (returns 204)
- [ ] Deleting a pipeline cascade-deletes its alert rules (DB-level: ON DELETE CASCADE on FK — already exists)
- [ ] `AlertDispatcher.dispatch()` receives `pipeline_id`, fetches active rules, only dispatches if anomaly severity >= threshold
- [ ] Unit tests for AlertRuleService and AlertDispatcher with mock rules

## Business Rules
- **Valid metrics:** `z_score`, `null_pct`, `volume_delta_pct`
- **Valid operators:** `gt`, `lt`, `gte`, `lte`, `eq`
- **AlertDispatcher:** Fires only if severity meets at least one active rule's threshold
- **No rules = no alert:** If no alert rules exist for a pipeline, NO alert is dispatched
- **No duplicates:** If multiple rules match the same anomaly, still only send one alert

## Technical Approach
**Decision:** Full backend stack: Alembic migration → model update → schemas → repository → service → routes → AlertDispatcher wiring.
**Rationale:** AlertRules are the bridge between anomaly detection and alert dispatch. Without them, every anomaly triggers an alert — noisy and useless. Structured fields replace the legacy free-text `condition`.

## Architecture Fit
Follows established layered pattern: domain/models.py → domain/schemas.py → infrastructure/repositories/ → application/ (service) → presentation/api/routes/. Routes nest under pipelines (RESTful: `/api/v1/pipelines/{pipeline_id}/rules`).

## Implementation Plan

### Tasks
- [x] Task 1: Create Alembic migration — drop `condition`, add `metric` (String 50), `operator` (String 10), `threshold` (Float)
- [x] Task 2: Update `AlertRule` model in `app/domain/models.py` — replace `condition` with `metric`, `operator`, `threshold`
- [x] Task 3: Create `AlertRuleCreate` and `AlertRuleUpdate` Pydantic schemas with field validation (Literal enums for metric/operator)
- [x] Task 4: Update `AlertRuleResponse` schema to match new fields
- [x] Task 5: Create `AlertRuleRepository` in `app/infrastructure/repositories/alert_rule_repo.py`
- [x] Task 6: Create `AlertRuleService` in `app/application/alert_rule_service.py`
- [x] Task 7: Create `AlertRule` routes in `app/presentation/api/routes/alert_rules.py` (nested under pipelines router)
- [x] Task 8: Register alert_rules router in `app/presentation/api/router.py`
- [x] Task 9: Update `AlertDispatcher.dispatch()` — accept `pipeline_id`, fetch active rules, filter by severity threshold, skip if no rules match
- [x] Task 10: Update `PipelineRunner.run_pipeline()` — pass `pipeline_id` to AlertDispatcher (or pipeline_id from pipeline)
- [x] Task 11: Write unit tests for `test_alert_rule_service.py` and update `test_alert_dispatcher.py`
- [x] Task 12: Run security-checker
- [x] Task 13: Run backend unit tests

### Implementation Order
1. Migration + model (data layer foundation)
2. Schemas (API contract)
3. Repository (data access)
4. Service (business logic)
5. Routes (HTTP layer)
6. AlertDispatcher wiring (integration)
7. PipelineRunner update (caller side)
8. Tests
9. Security scan

### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| alembic/versions/XXXX_alert_rules_structured_fields.py | CREATE | Migration: condition → metric/operator/threshold |
| app/domain/models.py | MODIFY | Update AlertRule model fields |
| app/domain/schemas.py | MODIFY | Add AlertRuleCreate, AlertRuleUpdate, update AlertRuleResponse |
| app/infrastructure/repositories/alert_rule_repo.py | CREATE | AlertRule CRUD repository |
| app/application/alert_rule_service.py | CREATE | AlertRule business logic |
| app/presentation/api/routes/alert_rules.py | CREATE | AlertRule REST routes |
| app/presentation/api/router.py | MODIFY | Register alert_rules routes |
| app/application/alert_dispatcher.py | MODIFY | Wire threshold filtering |
| app/application/pipeline_runner.py | MODIFY | Pass pipeline context to dispatcher |
| tests/application/test_alert_rule_service.py | CREATE | Unit tests |
| tests/application/test_alert_dispatcher.py | MODIFY | Update for threshold filtering |
| tests/presentation/routes/test_alert_rules.py | CREATE | Route integration tests |

### API Contracts

```
POST   /api/v1/pipelines/{pipeline_id}/rules
GET    /api/v1/pipelines/{pipeline_id}/rules
GET    /api/v1/pipelines/{pipeline_id}/rules/{rule_id}
PUT    /api/v1/pipelines/{pipeline_id}/rules/{rule_id}
DELETE /api/v1/pipelines/{pipeline_id}/rules/{rule_id}  → 204
```

**Request (Create):**
```json
{
  "metric": "z_score",
  "operator": "gt",
  "threshold": 2.0,
  "channels": ["email"],
  "enabled": true
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "pipeline_id": "uuid",
    "metric": "z_score",
    "operator": "gt",
    "threshold": 2.0,
    "channels": ["email"],
    "enabled": true,
    "created_at": "2026-...",
    "updated_at": "2026-..."
  },
  "error": null
}
```

### Database Changes
- **Migration:** `ALTER TABLE alert_rules DROP COLUMN condition, ADD COLUMN metric VARCHAR(50) NOT NULL, ADD COLUMN operator VARCHAR(10) NOT NULL, ADD COLUMN threshold FLOAT NOT NULL`
- **Rollback:** Reverse — drop new columns, add condition back (data loss on forward migration — condition values cannot be auto-converted)

### AlertDispatcher Logic (Pseudocode)
```python
async def dispatch(self, anomaly, pipeline_id=None) -> list:
    if not pipeline_id:
        return []  # no pipeline, no rules
    
    # Fetch active rules for this pipeline
    rules = await rule_service.list_active_by_pipeline(pipeline_id)
    if not rules:
        return []  # no rules → no alert
    
    # Check if any rule threshold is met
    should_alert = any(
        self._evaluate_rule(rule, anomaly) for rule in rules
    )
    if not should_alert:
        return []
    
    # Create alert + send email (existing logic)
    ...
```

## Testing Strategy
- **Unit tests:** AlertRuleService CRUD (mock repository), AlertDispatcher threshold filtering (mock rules), schema validation (invalid metric/operator)
- **Integration tests:** Routes via httpx async client (requires PostgreSQL)
- **Edge cases:** No rules → no alert, multiple rules → single alert, disabled rules ignored, invalid metric/operator → 422

## Risks and Considerations
- **Forward migration data loss:** Existing `condition` strings cannot be auto-converted to structured fields. Acceptable — no production data.
- **AlertDispatcher signature change:** Adding `pipeline_id` parameter may break existing callers. Audit all `dispatch()` call sites.
- **Cascade delete:** Already configured on FK (`ondelete="CASCADE"`) — no service-layer cleanup needed.
- **User isolation:** AlertRules inherit user scope from parent pipeline. Service must verify pipeline ownership before rule operations.

## Dependencies
- **External:** None
- **Internal:** `AlertRule` model (exists), `AlertDispatcher` (exists), `PipelineRunner` (exists), Alembic migrations

## Evidence (filled by tester/reviewer)
- **Test Log:** .opencode/work/logs/test-run-issue-19-20260619-011555.md
- **Coverage:** .opencode/work/logs/coverage-issue-19-20260619-011555.md
- **Security Scan:** Passed (ruff — all checks passed)
- **Review Verdict:** APPROVED PASS — 71/71 targeted tests, 183/183 full suite, zero regressions

---
*Created by @orchestrator-nontdd*
*Last updated: 2026-06-19*
