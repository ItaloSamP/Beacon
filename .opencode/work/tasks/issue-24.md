# Task: issue-24 — E2E CI Pipeline

## Status: READY_TO_COMMIT

## Metadata
- **Type:** infra
- **Scope:** infrastructure
- **Priority:** high
- **Source:** GitHub Issue #24
- **Labels:** infra, qa, priority:high

## Problem Statement
Need an end-to-end CI pipeline that runs Playwright tests on push to main and daily schedule. E2E tests verify full user flows against a real backend + frontend via Docker Compose. Failures on main auto-create GitHub issues with failure details and screenshots.

## Acceptance Criteria
- [ ] `.github/workflows/e2e-ci.yml` created with Docker Compose setup
- [ ] Workflow starts services (backend, frontend, postgres) via Docker Compose
- [ ] Waits for health checks before running tests
- [ ] Runs Playwright tests (`npx playwright test`)
- [ ] On push to main: runs full suite
- [ ] On schedule: daily at 06:00 UTC
- [ ] On failure (main only): auto-creates GitHub issue with failure details + screenshots
- [ ] Uploads Playwright HTML report as workflow artifact
- [ ] Does NOT block PR merge

## Technical Approach
**Decision:** Single GitHub Actions workflow using Docker Compose for service orchestration, Playwright for testing, with conditional issue creation on main branch failures.
**Rationale:** Docker Compose provides reproducible environment. Separate from frontend CI to keep PR checks fast. Auto-issue creation ensures visibility without blocking deploys.

## Architecture Fit
Infrastructure-only. Uses existing `docker-compose.yml` and `frontend/tests/e2e/` Playwright tests. No application code changes.

## Implementation Plan

### Tasks
- [x] Task 1: Create `.github/workflows/e2e-ci.yml` with dual triggers (push main + schedule)
- [x] Task 2: Add Docker Compose service startup steps
- [x] Task 3: Add health check wait logic
- [x] Task 4: Add Playwright install + test execution steps
- [x] Task 5: Add artifact upload (Playwright HTML report)
- [x] Task 6: Add auto-issue creation on main failure
- [x] Task 7: Run security-checker on workflow file
- [x] Task 8: YAML syntax validation

### Implementation Order
1. Workflow triggers and permissions
2. Service orchestration (Docker Compose)
3. Health check waiting
4. Playwright setup and execution
5. Artifact upload and issue creation
6. Validation

### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| .github/workflows/e2e-ci.yml | CREATE | E2E CI pipeline with Playwright |

### Workflow Design
```yaml
name: E2E Tests
on:
  push:
    branches: [main]
    paths-ignore: ['**.md', '.opencode/**']
  schedule:
    - cron: '0 6 * * *'  # daily 06:00 UTC

permissions:
  contents: read
  issues: write           # for auto-creating issues on failure

jobs:
  e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3

      - name: Start services
        run: docker compose -f docker-compose.yml up -d --build

      - name: Wait for backend health
        run: |
          for i in $(seq 1 30); do
            curl -s http://localhost:8000/api/v1/health && break
            sleep 2
          done

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: frontend/package-lock.json }

      - name: Install Playwright
        working-directory: frontend
        run: |
          npm ci
          npx playwright install --with-deps chromium

      - name: Run Playwright tests
        working-directory: frontend
        run: npx playwright test

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/

      - name: Create issue on failure (main only)
        if: failure() && github.ref == 'refs/heads/main'
        uses: actions/github-script@v7
        with:
          script: |
            const { data: run } = await github.rest.actions.getWorkflowRun({
              owner: context.repo.owner,
              repo: context.repo.repo,
              run_id: context.runId
            });
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `E2E Failure — ${new Date().toISOString().slice(0, 10)}`,
              body: `E2E tests failed on main.\n\nRun: ${run.html_url}\n\nCheck artifacts for screenshots and report.`,
              labels: ['bug', 'priority:high']
            });
```

## Testing Strategy
- **Structural:** YAML syntax validation
- **Integration:** Manual trigger on push to main (cannot fully test locally)

## Risks and Considerations
- Docker Compose on GitHub Actions runner may have resource constraints
- Health check wait loop: 30 attempts × 2s = 60s max wait
- Playwright browser install adds ~30s to pipeline
- `contents: read` + `issues: write` — minimal permissions
- Does NOT block PRs — E2E is informational only on main

## Dependencies
- **External:** Docker, Playwright
- **Internal:** `docker-compose.yml`, `frontend/tests/e2e/`, `frontend/playwright.config.ts`

## Evidence (filled by tester/reviewer)
- **Test Log:** .opencode/work/logs/test-run-24-20260619-011732.md
- **Coverage:** .opencode/work/logs/coverage-24-20260619-011732.md
- **Security Scan:** .opencode/work/logs/security-24-20260619.md — PASS (0 findings)
- **Review Verdict:** APPROVED Structural validation PASS — 18/18 checks passed

---
*Created by @orchestrator-nontdd*
*Last updated: 2026-06-19*
