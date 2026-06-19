# Task: issue-28 — Docker Build and Push to GHCR

## Status: READY_TO_COMMIT

## Metadata
- **Type:** infra
- **Scope:** infrastructure
- **Priority:** high
- **Source:** GitHub Issue #28
- **Labels:** infra, docker, priority:high

## Problem Statement
Need a GitHub Actions pipeline that builds Docker images for all 3 Beacon components (backend, frontend, agent) and pushes them to GitHub Container Registry (ghcr.io). This enables the E2E CI pipeline (#24) and future Render deploy (#29) to use pre-built images.

## Acceptance Criteria
- [ ] `.github/workflows/docker-build.yml` created
- [ ] Builds backend image and pushes to `ghcr.io/italosamp/beacon-backend:latest` + `:sha-XXXXXXX`
- [ ] Builds frontend image and pushes to `ghcr.io/italosamp/beacon-frontend:latest` + `:sha-XXXXXXX`
- [ ] Builds agent image and pushes to `ghcr.io/italosamp/beacon-agent:latest` + `:sha-XXXXXXX`
- [ ] Docker Buildx layer caching enabled
- [ ] Runs on push to main only (after CI pipelines)
- [ ] Build report exported (image sizes, tags, duration)

## Technical Approach
**Decision:** Single GitHub Actions workflow with Docker Buildx, multi-stage builds, layer caching via `cache-to`/`cache-from`.
**Rationale:** GHCR is free for public repos, Docker Buildx provides efficient parallel builds with caching.

## Architecture Fit
Infrastructure-only. Uses existing Dockerfiles at `backend/Dockerfile`, `frontend/Dockerfile`, `agent/Dockerfile`. No application code changes.

## Implementation Plan

### Tasks
- [x] Task 1: Create `.github/workflows/docker-build.yml` with buildx setup and GHCR login
- [x] Task 2: Add backend image build + push job
- [x] Task 3: Add frontend image build + push job
- [x] Task 4: Add agent image build + push job
- [x] Task 5: Add build report export step
- [x] Task 6: Run security-checker on workflow file
- [x] Task 7: YAML syntax validation

### Implementation Order
1. Create workflow skeleton (triggers, permissions, buildx setup)
2. Backend build job (most critical)
3. Frontend build job
4. Agent build job
5. Build report export
6. Validate

### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| .github/workflows/docker-build.yml | CREATE | Docker build + push to GHCR |

### Workflow Design
```yaml
name: Docker Build & Push
on:
  push:
    branches: [main]
    paths-ignore: ['**.md', '.opencode/**']

permissions:
  contents: read
  packages: write

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: [backend, frontend, agent]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: ${{ matrix.component }}/Dockerfile
          push: true
          tags: |
            ghcr.io/italosamp/beacon-${{ matrix.component }}:latest
            ghcr.io/italosamp/beacon-${{ matrix.component }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Testing Strategy
- **Structural:** YAML syntax validation, GitHub Actions workflow validation
- **Integration:** Manual trigger on push to main (cannot fully test locally)

## Risks and Considerations
- Uses `secrets.GITHUB_TOKEN` (auto-provided) — no manual secret setup needed
- Images are public by default on GHCR (repo is public)
- Layer caching via GitHub Actions cache may have size limits
- `paths-ignore` prevents builds on doc-only changes

## Dependencies
- **External:** GitHub Container Registry (ghcr.io) — free for public repos
- **Internal:** Dockerfiles at `backend/Dockerfile`, `frontend/Dockerfile`, `agent/Dockerfile`

## Evidence (filled by tester/reviewer)
- **Test Log:** .opencode/work/logs/test-run-issue-28-20260619-013000.md
- **Coverage:** .opencode/work/logs/coverage-issue-28-20260619-013000.md
- **Security Scan:** .opencode/work/logs/security-28-20260619.md
- **Review Verdict:** APPROVED PASS (9/9 structural validations passed)

---
*Created by @orchestrator-nontdd*
*Last updated: 2026-06-19*
