# Task: issue-21 — Backend CI pipeline (ruff, mypy, pytest, bandit, coverage)

## Status: DONE

## Metadata
- **Type:** infra
- **Scope:** backend
- **Priority:** high
- **Source:** GitHub Issue #21

## Problem Statement
Zero CI/CD exists for the Beacon backend. Every push and PR to `app/**`, `tests/**`, `alembic/**`, `pyproject.toml` should trigger automated quality gates: linting, type-checking, testing, coverage, and security scanning.

## Acceptance Criteria
- [x] GitHub Actions workflow triggers on push/PR to backend paths + daily schedule
- [x] PostgreSQL 16 service container available for integration tests
- [x] Ruff lint: zero errors (blocks merge)
- [x] Mypy type-check: zero errors (blocks merge)
- [x] Pytest: all tests pass (blocks merge)
- [x] Coverage: minimum 80% overall (blocks merge)
- [x] Bandit: zero HIGH severity (blocks merge)
- [x] Coverage XML uploaded as artifact

## Technical Approach
**Decision:** Single workflow file `.github/workflows/backend-ci.yml` on `ubuntu-latest` with PostgreSQL 16 service container. Add ruff, mypy, bandit, pytest-cov to dev dependencies. Create minimal config for each tool. Use `pip install -e ".[dev]"` for dependency installation.

**Origin:** issue-specified
**Rationale:** Ubuntu runner avoids the asyncpg/Windows ProactorEventLoop incompatibility documented in PROJECT_CONTEXT.md §10. Service container approach is standard for GitHub Actions DB testing. Adding tools to dev dependencies is PROJECT_CONTEXT.md §2 convention.

## Architecture Fit
- **Stack:** Python 3.13 + FastAPI, per PROJECT_CONTEXT.md §2
- **Dev commands:** Align with existing commands in PROJECT_CONTEXT.md §2 (ruff, mypy, pytest, bandit)
- **Test DB:** PostgreSQL 16 matches project requirement (PROJECT_CONTEXT.md §10)
- **No new application code** — infrastructure-only change

## Implementation Plan

### Tasks
- [x] Task 1: Add dev dependencies to pyproject.toml
  - `ruff>=0.9,<1.0`
  - `mypy>=1.14,<1.15`
  - `bandit>=1.8,<2.0`
  - `pytest-cov>=6.0,<7.0`
- [x] Task 2: Create `ruff.toml` at project root
  - Line length 88 (matches Black, PROJECT_CONTEXT.md §5)
  - Python 3.13 target
  - Enable recommended rules
  - Exclude migrations, tests from some rules
- [x] Task 3: Create `[tool.mypy]` section in pyproject.toml
  - `python_version = "3.13"`
  - `strict = false` (progressive — enable incrementally)
  - `ignore_missing_imports = true`
  - `warn_return_any = true`
  - `warn_unused_configs = true`
- [x] Task 4: Create `.github/workflows/backend-ci.yml`
  - **Trigger:** push + PR to `app/**`, `tests/**`, `alembic/**`, `pyproject.toml`, `requirements.txt` + schedule daily 06:00 UTC
  - **Env:** Python 3.13, PostgreSQL 16 service container (postgres:16, user: beacon_user, password: beacon_pass, db: beacon_db)
  - **Steps:**
    1. Checkout code
    2. Setup Python 3.13
    3. Cache pip packages
    4. Install dependencies (`pip install -e ".[dev]"`)
    5. Wait for PostgreSQL (`pg_isready`)
    6. Run Alembic migrations (`alembic upgrade head`)
    7. Ruff lint (`python -m ruff check .`) — fail on any error
    8. Mypy type-check (`python -m mypy app/`) — fail on any error
    9. Pytest with coverage (`python -m pytest --cov=app --cov-report=xml --cov-report=term --cov-fail-under=80`)
    10. Bandit security scan (`python -m bandit -r app/ -ll`) — fail on HIGH
    11. Upload coverage.xml artifact

### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| pyproject.toml | MODIFY | Add ruff, mypy, bandit, pytest-cov to dev deps; add [tool.mypy] section |
| ruff.toml | CREATE | Ruff linter configuration |
| .github/workflows/backend-ci.yml | CREATE | CI workflow definition |

### CI Pipeline Quality Gates
| Gate | Command | Threshold |
|------|---------|-----------|
| Ruff lint | `python -m ruff check .` | zero errors |
| Mypy type-check | `python -m mypy app/` | zero errors |
| Pytest | `python -m pytest --cov=app --cov-report=xml --cov-fail-under=80` | all pass + ≥80% coverage |
| Bandit | `python -m bandit -r app/ -ll` | zero HIGH severity |

## Testing Strategy
- Not applicable — this is a CI/CD infrastructure change. The workflow itself is the test.
- Manual verification: push a commit to trigger the workflow, verify all steps pass on GitHub Actions.
- The `pytest` step in CI serves as the validation that the CI configuration works correctly.

## Risks and Considerations
- **Coverage threshold:** Current coverage may be below 80% due to Windows-only test runs (asyncpg issues). On Linux in CI, all tests should pass and coverage should be higher. If still below 80%, adjust threshold or add test coverage.
- **Mypy strictness:** Using `strict = false` initially to avoid massive type annotation debt. Should progressively tighten.
- **Bandit baseline:** May have existing LOW/MEDIUM findings — only block on HIGH.
- **Secrets:** No secrets needed for CI (test DB uses hardcoded credentials matching docker-compose).
- **Cache:** pip caching via `actions/cache` or `actions/setup-python` built-in cache.

## Dependencies
- **External:** GitHub Actions (`setup-python`, `actions/cache`, `actions/upload-artifact`)
- **Internal:** None

## Evidence (filled by tester/reviewer)
- **Test Log:** <path — filled after testing>
- **Coverage:** <path — filled after testing>
- **Security Scan:** <path — filled after review>
- **Review Verdict:** <APPROVED|CHANGES_REQUESTED — filled after review>

---
*Created by @orchestrator-nontdd*
*Last updated: 2026-06-10T00:00:00Z*
