# Task: task-issues-20-25-29 — Batch Execution: Issues #20, #25, #29

## Status: DONE

## Metadata
- **Type:** feature + infra + deploy
- **Scope:** full-stack + infrastructure
- **Priority:** high (all 3 issues)
- **Source:** GitHub Issues #20, #25, #29
- **Execution Model:** Parallel — issues are independent, touching different layers

---

## Issues Summary

### #20 — [FEATURE] Add AlertRules UI section to Pipeline create/edit form
**Layer:** Frontend | **Blocked by:** #19 (complete) | **Labels:** feature, frontend, priority:high

Add `AlertRulesSection` component integrated inline into `PipelineForm`, allowing users to manage alert rules (CRUD) directly from the pipeline create/edit form.

**Acceptance Criteria:**
- [ ] `AlertRulesSection` renders list of existing rules with metric, operator, threshold, delete button
- [ ] Add Rule button opens inline form with dropdowns + threshold input + Save/Cancel
- [ ] Edit button switches to inline edit mode
- [ ] Delete button removes rule with optimistic UI update
- [ ] Component integrated into `PipelineForm` (create and edit modes)
- [ ] Create mode: rules section shows disabled state with helper text
- [ ] Edit mode: rules section is fully interactive
- [ ] TypeScript types defined for `AlertRule`, `AlertRuleCreate`
- [ ] API client functions in `lib/api.ts`: `getRules(pipelineId)`, `createRule(data)`, `updateRule(ruleId, data)`, `deleteRule(ruleId)`
- [ ] Unit tests for `AlertRulesSection`

### #25 — [INFRA] Reports aggregator — collect all pipeline results into reports.json
**Layer:** CI/CD | **Blocked by:** #21, #22, #23, #24, #28 (all complete) | **Labels:** infra, priority:high

Create a GitHub Actions workflow that collects artifacts from all 5 CI pipelines and generates a consolidated `reports.json` committed to the `gh-pages` branch.

**Acceptance Criteria:**
- [ ] Workflow collects artifacts from: backend-ci, frontend-ci, agent-ci, docker-build, e2e-ci
- [ ] Parses test results, coverage, lint, security scan, and Docker build report
- [ ] Generates consolidated `reports.json`
- [ ] Commits `reports.json` to `gh-pages` branch
- [ ] Appends to history array (keeps last 20 runs)
- [ ] Creates `gh-pages` branch if it does not exist
- [ ] Generates markdown summary in workflow output

### #29 — [INFRA] Deploy to Render — backend web service + frontend static site
**Layer:** Infrastructure/Deploy | **Blocked by:** None (related to #28 Docker images) | **Labels:** infra, deploy, priority:high

Configure automatic deploy to Render (PaaS) on every push to main. Backend as Web Service, frontend as Static Site.

**Acceptance Criteria:**
- [ ] `render.yaml` Blueprint created with backend Web Service + frontend Static Site config
- [ ] Backend: build `pip install -e ".[dev]" && alembic upgrade head`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Frontend: build `cd frontend && npm install && npm run build`, publish `frontend/dist`
- [ ] `VITE_BACKEND_URL` env var configured in frontend to point to backend Render URL
- [ ] Health check endpoint configured for backend: `/api/v1/health`
- [ ] Required secrets documented: `DATABASE_URL`, `JWT_SECRET`, `SENDGRID_API_KEY`, `FERNET_KEY`
- [ ] Deploy verified: backend health returns 200, frontend loads and can login

---

## Technical Approach

**Decision:** Independent parallel implementation with sequential verification.
**Origin:** collaborative (user confirmed the approach)
**Rationale:** Issues touch separate domains (frontend component, CI workflow, deployment infra) with zero code overlap. Parallel execution is safe and efficient.

### Issue #20 — AlertRules UI

**Approach B: Co-located component** — `AlertRulesSection.tsx` as a separate component in `features/pipelines/`, imported by `PipelineForm.tsx`. Matches the issue's own design notes and the project's feature-based organization pattern.

**Key decisions:**
- `AlertRulesSection` receives `pipelineId`, `isEditing` as props
- React Query (`useQuery` for list, `useMutation` for create/update/delete) with TanStack Query cache invalidation
- Optimistic UI update for delete (remove from cache before server confirmation)
- Loading state for create/update (inline form shows spinner)
- Create mode disables the entire section with helper text: "Save the pipeline first to add rules"
- Metric dropdown options: `z_score` → "Z-Score", `null_pct` → "Null %", `volume_delta_pct` → "Volume Delta %"
- Operator dropdown options: `gt` → ">", `lt` → "<", `gte` → "≥", `lte` → "≤", `eq` → "="
- Threshold input: number type, step 0.1, min 0 for z_score/null_pct

### Issue #25 — Reports Aggregator

**Approach A: Shared artifact + schedule** — Each existing pipeline uploads its results to a shared `beacon-results/` artifact area. The aggregator runs on `push` to `main` and on a `schedule` (every 10 min), reading all available artifacts and generating `reports.json`.

**Key decisions:**
- Artifacts collected via `actions/download-artifact` from the most recent run of each pipeline
- Generates JSON with structure: `{ generated_at, commit, branch, components: { backend, frontend, agent, docker, e2e }, history: [last 20 runs] }`
- Pushes to `gh-pages` branch only (never main)
- Uses `peaceiris/actions-gh-pages@v4` for gh-pages branch management

### Issue #29 — Deploy to Render

**Approach A with fallback: `render.yaml` Blueprint** — Declare infrastructure as code in `render.yaml`, with manual setup as fallback for secrets (env vars).

**Key decisions:**
- `render.yaml` declares 2 services: `beacon-backend` (Web Service) and `beacon-frontend` (Static Site)
- Backend uses Docker-based build OR native Python build (Render supports either)
- Frontend uses `VITE_BACKEND_URL` env var pointing to the Render backend URL
- Agent is NOT deployed — it's a pip package installed by end users
- Health check: `GET /api/v1/health` returning `{"database": "connected"}`

---

## Architecture Fit

### Issue #20
- Follows existing feature-based frontend organization (`features/pipelines/`)
- Uses existing UI components (`Card`, `Input`, `Select`, `Button` from `components/ui/`)
- Uses existing TanStack Query pattern (staleTime, invalidateQueries)
- Uses existing API client pattern (`lib/api.ts` generic `api.get/post/put/delete`)
- Backend AlertRule endpoints already exist under `/api/v1/pipelines/{pipeline_id}/rules`

### Issue #25
- Follows existing GitHub Actions workflow patterns (checkout, setup-python, matrix builds)
- Does NOT modify any existing workflow files — purely additive
- Uses `gh-pages` branch (no impact on main branch, no PR merge blocking)

### Issue #29
- Follows Render Blueprint spec (`render.yaml` at repo root)
- Uses existing Docker images already pushed to ghcr.io by `docker-build.yml`
- Uses existing health check endpoint (`/api/v1/health`)
- Environment variable strategy matches existing `.env.example` pattern

---

## Implementation Plan

### Issue #20 Tasks (Frontend)

- [x] **T20.1:** Define TypeScript types — `AlertRule`, `AlertRuleCreate`, `AlertRuleUpdate` in `frontend/src/types/alert_rule.ts`
- [x] **T20.2:** Add AlertRule API functions — `getRules(pipelineId)`, `createRule(pipelineId, data)`, `updateRule(pipelineId, ruleId, data)`, `deleteRule(pipelineId, ruleId)` in `frontend/src/lib/api.ts`
- [x] **T20.3:** Create `AlertRulesSection.tsx` component in `frontend/src/features/pipelines/` — list view, inline add form, inline edit, delete with optimistic UI
- [x] **T20.4:** Integrate `AlertRulesSection` into `PipelineForm.tsx` — pass `pipelineId` and `isEditing` props, display below pipeline config fields
- [x] **T20.5:** Write unit tests for `AlertRulesSection` — render rules list, add/edit/delete flows, disabled state for create mode
- [x] **T20.6:** Run full frontend test suite + TypeScript check + lint to verify no regressions

### Issue #25 Tasks (CI/CD)

- [x] **T25.1:** Create `reports-aggregator.yml` workflow in `.github/workflows/` — trigger on push to main + schedule (every 10 min)
- [x] **T25.2:** Implement artifact collection step — download from all 5 workflows via `actions/download-artifact`
- [x] **T25.3:** Implement report generation script — parse artifacts, build `reports.json` structure with history
- [x] **T25.4:** Implement gh-pages commit step — create branch if needed, commit `reports.json`, push via `peaceiris/actions-gh-pages@v4`
- [x] **T25.5:** Verify workflow — check triggers, artifact downloads, generated JSON shape, branch commit

### Issue #29 Tasks (Deploy)

- [x] **T29.1:** Create `render.yaml` at repo root — define `beacon-backend` (Web Service) and `beacon-frontend` (Static Site)
- [x] **T29.2:** Configure backend service — build command, start command, health check path, env var declarations
- [x] **T29.3:** Configure frontend service — build command, publish directory, `VITE_BACKEND_URL` env var
- [x] **T29.4:** Create deploy documentation — `DEPLOY.md` with setup steps, required secrets, post-deploy verification checklist
- [x] **T29.5:** Verify `render.yaml` schema validity against Render Blueprint spec

---

## Implementation Order

### Phase 1 — Parallel (Issues #20, #25, #29)
All three issues can be implemented simultaneously — they touch different files with zero overlap.

1. **Issue #20** — Frontend component + types + API functions + tests
2. **Issue #25** — CI workflow + report generation
3. **Issue #29** — Render configuration + docs

### Phase 2 — Sequential Verification
After all three issues are implemented:

4. Run frontend test suite (T20.6)
5. Verify workflow YAML validity (T25.5)
6. Verify `render.yaml` schema (T29.5)
7. Run full project CI to ensure no regressions

---

## Files to Create/Modify

### Issue #20

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/types/alert_rule.ts` | CREATE | `AlertRule`, `AlertRuleCreate`, `AlertRuleUpdate` TypeScript interfaces |
| `frontend/src/lib/api.ts` | MODIFY | Add 4 typed endpoint functions: `getRules`, `createRule`, `updateRule`, `deleteRule` |
| `frontend/src/features/pipelines/AlertRulesSection.tsx` | CREATE | Alert rules CRUD UI component with list, add, edit, delete |
| `frontend/src/features/pipelines/PipelineForm.tsx` | MODIFY | Import and render `AlertRulesSection`, pass `pipelineId` and `isEditing` |
| `frontend/src/features/pipelines/__tests__/AlertRulesSection.test.tsx` | CREATE | Unit tests: render rules list, add/edit/delete flows, disabled state for create mode |

### Issue #25

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/reports-aggregator.yml` | CREATE | Workflow: collect + parse + generate reports.json + commit to gh-pages |

### Issue #29

| File | Action | Purpose |
|------|--------|---------|
| `render.yaml` | CREATE | Render Blueprint: backend Web Service + frontend Static Site |
| `DEPLOY.md` | CREATE | Deploy documentation: setup steps, secrets, verification checklist |

---

## API Contracts (Issue #20)

Backend endpoints already exist — no API changes needed. The frontend will consume:

```
GET    /api/v1/pipelines/{pipeline_id}/rules        → { data: AlertRule[] }
POST   /api/v1/pipelines/{pipeline_id}/rules        → { data: AlertRule }  [201]
PUT    /api/v1/pipelines/{pipeline_id}/rules/{id}   → { data: AlertRule }
DELETE /api/v1/pipelines/{pipeline_id}/rules/{id}   → 204 No Content
```

**AlertRule schema (from backend `schemas.py:387-398`):**
```typescript
interface AlertRule {
  id: string;            // UUID
  pipeline_id: string;   // UUID
  metric: string;        // "z_score" | "null_pct" | "volume_delta_pct"
  operator: string;      // "gt" | "lt" | "gte" | "lte" | "eq"
  threshold: number;     // float
  channels: string[];    // ["email"] | ["slack"] | ["email", "slack"]
  enabled: boolean;
  created_at: string;    // ISO 8601
  updated_at: string;    // ISO 8601
}
```

**AlertRuleCreate schema (from backend `schemas.py:321-351`):**
```typescript
interface AlertRuleCreate {
  metric: string;         // required: "z_score" | "null_pct" | "volume_delta_pct"
  operator: string;       // required: "gt" | "lt" | "gte" | "lte" | "eq"
  threshold: number;      // required: float, > 0
  channels?: string[];    // optional, default: ["email"]
  enabled?: boolean;      // optional, default: true
}
```

---

## reports.json Structure (Issue #25)

```json
{
  "generated_at": "2026-06-20T12:00:00Z",
  "commit": "abc123def456...",
  "branch": "main",
  "components": {
    "backend": {
      "tests": { "passed": 180, "failed": 0, "skipped": 0 },
      "coverage": { "statements": 85.5, "branches": 78.3, "functions": 90.1, "lines": 85.5 },
      "lint": { "passed": true, "issues": 0 },
      "type_check": { "passed": true, "errors": 0 },
      "security": { "passed": true, "issues": 0 }
    },
    "frontend": {
      "tests": { "passed": 750, "failed": 0, "skipped": 0 },
      "coverage": { "statements": 89.2, "branches": 84.6, "functions": 91.3, "lines": 89.2 },
      "lint": { "passed": true, "issues": 0 },
      "type_check": { "passed": true, "errors": 0 },
      "build": { "passed": true }
    },
    "agent": {
      "tests": { "passed": 66, "failed": 0, "skipped": 0 },
      "coverage": { "statements": 92.0, "branches": 85.0, "functions": 95.0, "lines": 92.0 },
      "lint": { "passed": true, "issues": 0 },
      "type_check": { "passed": true, "errors": 0 }
    },
    "docker": {
      "backend": { "built": true, "tag": "ghcr.io/italosamp/beacon-backend:abc123" },
      "frontend": { "built": true, "tag": "ghcr.io/italosamp/beacon-frontend:abc123" },
      "agent": { "built": true, "tag": "ghcr.io/italosamp/beacon-agent:abc123" }
    },
    "e2e": {
      "tests": { "passed": 12, "failed": 0, "skipped": 1 },
      "report_url": "https://github.com/ItaloSamP/Beacon/actions/runs/..."
    }
  },
  "history": [ /* last 20 runs in the same shape */ ]
}
```

---

## Component Hierarchy (Issue #20)

```
PipelineForm
├── <form> pipeline fields (name, type, datasource, schedule, config, enabled)
├── ... other pipeline fields
└── AlertRulesSection (pipelineId, isEditing)
    ├── <h3> "Alert Rules"
    ├── {isEditing ? <AddRuleButton> : <DisabledHelperText>}
    ├── <ul> rules list
    │   └── <li> each rule
    │       ├── <Badge> metric name
    │       ├── <span> operator + threshold
    │       ├── <Button variant="ghost" size="sm"> ✏️ Edit
    │       └── <Button variant="ghost" size="sm"> 🗑️ Delete
    └── {showAddForm && <InlineRuleForm mode="create">}
        └── <InlineRuleForm>
            ├── <Select> metric dropdown (Z-Score, Null %, Volume Delta %)
            ├── <Select> operator dropdown (>, <, ≥, ≤, =)
            ├── <Input type="number" step="0.1"> threshold
            ├── <Button> Save
            └── <Button variant="ghost"> Cancel
```

**State management:**
- `useQuery(['alert-rules', pipelineId], () => getRules(pipelineId))` — fetch rules
- `useMutation` for create, update, delete with `onSuccess` → `queryClient.invalidateQueries(['alert-rules', pipelineId])`
- Local state: `editingRuleId` (which rule is in edit mode), `showAddForm` (toggle inline add form)

---

## Testing Strategy

### Issue #20 (Frontend unit tests)
- **Framework:** Vitest + React Testing Library + MSW (same as existing frontend tests)
- **Test file:** `frontend/src/features/pipelines/__tests__/AlertRulesSection.test.tsx`
- **Test cases:**
  - Renders empty state when no rules exist
  - Renders list of rules with correct metric, operator, threshold, channels
  - Add button toggles inline form
  - Save creates rule and refreshes list
  - Edit button switches row to inline edit mode
  - Save updates rule and exits edit mode
  - Delete removes rule optimistically
  - Create mode: section shows disabled state with helper text
  - Edit mode: section is fully interactive
  - Error handling: displays error message on API failure
- **Coverage target:** 80%+ branch coverage for `AlertRulesSection.tsx`
- **MSW handlers:** Add 4 handlers for AlertRules endpoints in `frontend/src/test/mocks/handlers.ts`

### Issue #25 (CI workflow validation)
- **Validation:** Manual review of workflow YAML + `actionlint` + dry-run on push to branch
- **Test:** Trigger workflow manually, verify `reports.json` committed to `gh-pages` branch
- **Verify:** JSON structure matches contract, history array appends correctly

### Issue #29 (Deploy verification)
- **Validation:** Render Blueprint schema validation
- **Test:** Deploy to Render, verify health check, verify frontend loads
- **Post-deploy:** Manual verification checklist per acceptance criteria

---

## Risks and Considerations

### Issue #20
- **PipelineForm integration:** Ensure `AlertRulesSection` doesn't break existing pipeline create/edit flow. Use conditional rendering: only show when `pipelineId` is available (existing pipeline edit) and add disabled state for create mode.
- **Optimistic updates:** Delete should remove from TanStack Query cache immediately, with rollback on failure. Create/update should show loading state to prevent double-submits.
- **Channels field:** Issue #20 doesn't explicitly mention channels UI. The backend stores `channels: ["email"]` by default. Keep channels out of the v1 UI (auto-default to email) — simplicity over over-engineering.
- **Lucide icon verification:** Run `npx lucide-react@latest` to confirm icon names before implementing. Issue specifies: `Plus`, `Trash2`, `PencilLine`, `Save` (or `FloppyDisk`), `X`.

### Issue #25
- **Workflow_run limitation:** GitHub Actions `workflow_run` triggers on a SINGLE workflow. Using shared artifacts + schedule avoids race conditions.
- **Artifact retention:** GitHub deletes artifacts after 7 days (confirmed in existing workflows). The aggregator must run within that window.
- **gh-pages branch:** Use `peaceiris/actions-gh-pages@v4` which handles branch creation automatically.
- **Concurrency:** Schedule-based runs may conflict with push-triggered runs. Use `concurrency: reports-aggregator` group to prevent overlapping executions.

### Issue #29
- **Cold starts:** Render free tier has ~50s cold starts. Acceptable for MVP per issue notes.
- **Secrets management:** `render.yaml` should NOT contain actual secret values — only variable declarations. Actual values go into Render Environment Variables UI.
- **DATABASE_URL:** Render provides a managed PostgreSQL or the user can bring their own. Document both options.
- **Agent token:** Post-deploy, the agent needs a token from the deployed backend. Document the flow: login → create agent → copy token → use in agent CLI.

---

## Dependencies

### External (new packages)
- **Issue #20:** None — uses existing dependencies (React Query, Lucide React, TailwindCSS)
- **Issue #25:** `peaceiris/actions-gh-pages@v4` (GitHub Action, no npm/pip install)
- **Issue #29:** None — Render reads `render.yaml` natively

### Internal
- **Issue #20:** Depends on AlertRules backend (issue #19) — already implemented and verified
- **Issue #25:** Depends on all 5 CI workflows (#21-24, #28) — already implemented and running
- **Issue #29:** Depends on Docker images (#28) — already built and pushed to ghcr.io
- **No cross-issue dependencies** — all three can be implemented in parallel

---

## Evidence
- **Test Log:** `.opencode/work/logs/test-run-task-issues-20-25-29-20260620-204409.md` (Issue #20 — 760/760)
- **Coverage:** `.opencode/work/logs/coverage-task-issues-20-25-29-20260620-204409.md` (84.6% overall)
- **Security Scan:** PASSED (frontend — React auto-escapes; infra — no secrets exposed)
- **Review Verdict:** APPROVED (Issue #25: 1 MEDIUM `publish_dir` fixed inline; Issue #29: no issues)
- **Test Results:** 760/760 passing, 0 failed, 0 skipped
- **Coverage:** 84.6% statements, 87.42% branches (above 80% threshold)
- **TypeScript:** 0 errors
- **Lint:** 0 errors, 74 warnings (all pre-existing)
- **AlertRulesSection:** 96.02% statements, 81.96% branches (above 80% threshold)`

---

*Created by @plan-maker*
*Last updated: 2026-06-20T00:00:00Z*
