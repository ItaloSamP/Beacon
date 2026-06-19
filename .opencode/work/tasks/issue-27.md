# Task: issue-27 — Codecov Integration

## Status: READY_TO_COMMIT

## Metadata
- **Type:** infra
- **Scope:** infrastructure
- **Priority:** high
- **Source:** GitHub Issue #27
- **Labels:** infra, qa, priority:high

## Problem Statement
Codecov integration is needed for automated coverage tracking across all 3 CI pipelines (backend, frontend, agent). Currently CI workflows generate coverage artifacts but don't upload to Codecov — no trend tracking, no PR comments, no threshold enforcement.

## Acceptance Criteria
- [ ] `codecov.yml` created at repo root with 80% overall target, 2% diff threshold
- [ ] CODECOV_TOKEN added as GitHub Actions secret (documented, not committed)
- [ ] Backend CI (`backend-ci.yml`) uploads coverage to Codecov
- [ ] Frontend CI (`frontend-ci.yml`) uploads coverage to Codecov
- [ ] Agent CI (`agent-ci.yml`) uploads coverage to Codecov
- [ ] PR comment enabled (detailed)
- [ ] Status check blocks merge if coverage < 80%

## Technical Approach
**Decision:** Standard Codecov integration with codecov.yml + codecov/codecov-action@v5 upload steps in all 3 CI workflows.
**Rationale:** Codecov is free for public repos. Token needed for reliable uploads. Separate coverage targets per component (backend/frontend/agent) with carry-forward for combined view.

## Architecture Fit
Infrastructure-only change. No application code modified. Adds `.github/workflows/` modifications and a root `codecov.yml` config file.

## Implementation Plan

### Tasks
- [x] Task 1: Create `codecov.yml` at repo root with thresholds (80% overall, 2% patch, PR comments)
- [x] Task 2: Add Codecov upload step to `backend-ci.yml` (after pytest coverage)
- [x] Task 3: Add Codecov upload step to `frontend-ci.yml` (after vitest coverage)
- [x] Task 4: Add Codecov upload step to `agent-ci.yml` (after pytest coverage)
- [x] Task 5: Run security-checker on changes
- [x] Task 6: Verify YAML syntax validity

### Implementation Order
1. Create codecov.yml (foundation config)
2. Modify backend-ci.yml (most critical pipeline)
3. Modify frontend-ci.yml
4. Modify agent-ci.yml
5. Validate all YAML files

### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| codecov.yml | CREATE | Codecov configuration with thresholds and PR comments |
| .github/workflows/backend-ci.yml | MODIFY | Add Codecov upload step |
| .github/workflows/frontend-ci.yml | MODIFY | Add Codecov upload step |
| .github/workflows/agent-ci.yml | MODIFY | Add Codecov upload step |

### codecov.yml Configuration
```yaml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 2%
    patch:
      default:
        target: 80%
        threshold: 2%

comment:
  layout: "reach, diff, flags, files"
  behavior: default
  require_changes: false

github_checks:
  annotations: true

flags:
  backend:
    paths:
      - app/
    carryforward: true
  frontend:
    paths:
      - frontend/src/
    carryforward: true
  agent:
    paths:
      - agent/
    carryforward: true
```

## Testing Strategy
- **Structural:** YAML syntax validation
- **CI:** Verify CI workflow syntax via `gh workflow validate` or manual check

## Risks and Considerations
- CODECOV_TOKEN must be added manually as a GitHub Actions secret (cannot be automated)
- Codecov upload is additive — won't break existing CI
- `carryforward: true` means Codecov uses last known coverage if a flag isn't uploaded

## Dependencies
- **External:** Codecov (codecov.io) — free for public repos
- **Internal:** Existing CI workflows (backend-ci.yml, frontend-ci.yml, agent-ci.yml)

## Evidence (filled by tester/reviewer)
- **Test Log:** .opencode/work/logs/test-run-issue-27-20260619-011605.md
- **Coverage:** .opencode/work/logs/coverage-issue-27-20260619-011605.md
- **Security Scan:** PASS (no hardcoded tokens, all secrets referenced via ${{ secrets.CODECOV_TOKEN }})
- **Review Verdict:** APPROVED PASS — all 4 structural checks passed

---
*Created by @orchestrator-nontdd*
*Last updated: 2026-06-19*
