# Task: issue-32 — Real Pipeline Runner

## Status: READY_TO_COMMIT

## Metadata
- **Type:** feature
- **Scope:** backend
- **Priority:** high
- **Source:** GitHub Issue #32
- **Labels:** feature, backend, priority:high

## Problem Statement
The cloud-side pipeline runner (`app/application/pipeline_runner.py`) is a stub: `_execute_profiling()` returns `{row_count: 0}`, `_detect_anomaly()` always returns `None`. Running a pipeline produces no real results. This issue makes profiling real (connect to datasource PostgreSQL, run actual profiling) and anomaly detection real (compute z-scores from historical PipelineRun metrics).

## Acceptance Criteria
- [x] `_execute_profiling()` connects to datasource PostgreSQL and runs actual profiling (row count, null %)
- [x] `_detect_anomaly()` loads historical PipelineRun metrics, computes z-score, returns Anomaly when threshold exceeded
- [x] Pipeline run produces real `metrics_json`
- [x] Anomalous data creates Anomaly records
- [x] Clean data completes with success status and no anomalies
- [x] Connection failures handled gracefully (status = error)
- [x] Unit tests verify profiling output and anomaly detection

## Technical Approach
**Decision:** Evaluate importing agent modules (`agent/connectors/postgres.py`, `agent/profiling/`) first. If import is compatible (both use asyncpg), reuse agent code. If not, replicate profiling logic in cloud using asyncpg directly.
**Origin:** Issue-specified (code reuse over duplication)
**Rationale:** The agent already has working PostgresConnector and profilers. Reusing avoids duplication. The key question is whether the cloud's SQLAlchemy-based architecture can cleanly use asyncpg-based agent code — both use `asyncpg` under the hood.

## Architecture Fit
This is the **core value loop closure**: connect DB → profile → detect → alert → email. Currently the loop is broken at profiling/detection (stubs). Making it real completes Sprint 1's pipeline execution.

**Layer placement:** `app/application/pipeline_runner.py` (application layer) orchestrates profiling and detection. Profiling logic may live in agent imports or a new cloud-side module. Detection remains in pipeline_runner or moves to a dedicated `app/application/detection.py`.

## Implementation Plan

### Tasks
- [x] Task 1: Evaluate agent import compatibility — test `from agent.connectors.postgres import PostgresConnector` and `from agent.profiling.runner import ProfileRunner` in cloud context
- [x] Task 2: Create `app/application/profiling.py` — cloud-side profiling module (imports from agent or replicates)
- [x] Task 3: Replace `_execute_profiling()` stub with real implementation using datasource connection_config
- [x] Task 4: Create `app/application/detection.py` — z-score anomaly detection module
- [x] Task 5: Implement `_detect_anomaly()` — load historical PipelineRun metrics, compute z-score, return anomaly if threshold exceeded
- [x] Task 6: Wire profiling → detection → anomaly creation → alert dispatch in `run_pipeline()`
- [x] Task 7: Handle connection failures gracefully (try/except → status = error)
- [x] Task 8: Update `tests/application/test_pipeline_runner.py` with unit tests for profiling output and anomaly detection
- [x] Task 9: Run security-checker
- [x] Task 10: Run backend tests (unit only, Windows asyncpg limitation applies)

### Implementation Order
1. **Evaluate imports first** — agent import success/failure determines code duplication strategy
2. Profiling module (create or import)
3. Detection module (z-score logic)
4. Wire into pipeline_runner
5. Error handling
6. Tests
7. Security scan

### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| app/application/profiling.py | CREATE | Cloud-side profiling (import agent or replicate) |
| app/application/detection.py | CREATE | Z-score anomaly detection |
| app/application/pipeline_runner.py | MODIFY | Replace stubs with real profiling+detection |
| tests/application/test_pipeline_runner.py | MODIFY | Unit tests for real profiling and detection |

### Key Design Decisions
- **Z-score threshold:** 2.0 (default, configurable via pipeline config)
- **Baseline window:** 30 runs (configurable via pipeline config `baseline_window`)
- **Metrics tracked:** `row_count`, `null_pct` per table
- **Connection timeout:** 10 seconds
- **Error handling:** Connection failures → status=error, message in error_message field

### Z-Score Formula
```
z = (current_value - mean) / stddev
|z| > threshold → anomaly detected
```

## Testing Strategy
- **Unit tests:** Mock asyncpg connection, verify profiling returns real metrics, verify z-score computation with known baseline data
- **Integration tests:** Deferred to Linux CI (asyncpg/Windows incompatibility documented in PROJECT_CONTEXT.md)
- **Edge cases:** Empty historical data (no baseline), single historical run (stddev=0), null handling, connection timeout

## Risks and Considerations
- **Agent import may not work:** Agent uses raw asyncpg; cloud uses SQLAlchemy. Both ultimately use asyncpg, but import paths and dependency chains may differ. If import fails, replicate logic — ~100 lines per profiler.
- **Fernet key required:** `connection_config` is encrypted. Pipeline runner must decrypt using `app.infrastructure.crypto.decrypt_config()`.
- **Baseline window empty:** If no historical PipelineRuns exist, skip anomaly detection (no baseline to compare against).
- **asyncpg on Windows:** Integration tests will fail due to known ProactorEventLoop issue. Unit tests with mocks are the primary verification strategy.

## Dependencies
- **External:** asyncpg (already in agent deps)
- **Internal:** `app.infrastructure.crypto` (Fernet decrypt), `agent/connectors/postgres.py`, `agent/profiling/`

## Evidence (filled by tester/reviewer)
- **Test Log:** .opencode/work/logs/test-run-issue-32-20260619-011539.md
- **Coverage:** .opencode/work/logs/coverage-issue-32-20260619-011539.md
- **Lint (Ruff):** All checks passed
- **Review Verdict:** APPROVED PASS — 183/183 tests pass, 7 non-blocking warnings

---
*Created by @orchestrator-nontdd*
*Last updated: 2026-06-19*
