# OpenCode AI Team Template

A production-ready template for orchestrating a team of 13 specialized AI agents that collaborate to deliver features end-to-end — from product discovery to Pull Request — with six distinct workflows, mandatory parallelization, automated testing, security checks, and code review.

---

## Table of Contents

- [Architecture & Workflows](#architecture--workflows)
- [Agent Team](#agent-team)
- [Quick Start](#quick-start)
- [Solo Agents (Foundation & Operations)](#solo-agents-foundation--operations)
  - [project-setup](#project-setup)
  - [product-manager](#product-manager)
  - [issue-crafter](#issue-crafter)
  - [designer](#designer)
  - [committer](#committer)
- [Multi Agents (Development Pipeline)](#multi-agents-development-pipeline)
  - [plan-maker](#plan-maker)
  - [orchestrator-tdd](#orchestrator-tdd)
  - [orchestrator-nontdd](#orchestrator-nontdd)
  - [hotfix](#hotfix)
  - [executor-tdd](#executor-tdd)
  - [executor](#executor)
  - [tester](#tester)
  - [reviewer](#reviewer)
- [Quality Gates](#quality-gates)
- [GitHub Issues & Labels Standard](#github-issues--labels-standard)
- [Skills Reference](#skills-reference)
- [File Structure](#file-structure)
- [Parallelization Model](#parallelization-model)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)

---

## Architecture & Workflows

This template provides **6 distinct workflows** covering the full development lifecycle:

### Flow 1: Product Discovery → Issue (Solo)

```
@product-manager  →  (discuss scope, UX, business rules)
       │
       ├─ Generates doc (Feature Brief or Project Brief)
       ├─ Outputs: "Copy-paste ready" command with doc path
       │
       └─ MANDATORY: offer to generate document → STOP
              ↓
@issue-crafter .opencode/work/docs/feature-brief-<name>.md   →  (reads doc, skips discovery)
       │
       ├─ "I read the Feature Brief. Let me draft the issue based on this."
       ├─ Drafts issue using doc as source of truth
       ├─ Asks only about gaps (if any)
       │
       └─ Creates GitHub issue → STOP
              ↓
@orchestrator-tdd #N   OR   @orchestrator-nontdd #N
```

**The link is semi-automatic:**
1. `product-manager` outputs the exact command to copy-paste
2. `issue-crafter` auto-discovers the doc (even if you forget to pass the path)
3. If a doc is found, Discovery phase is skipped — no re-discussing what was already decided

### Flow 2: Requirements → Design (Solo)

```
@designer .opencode/work/docs/feature-brief-<name>.md   OR   @designer <description>
       │
       ├─ Reads brief + PROJECT_CONTEXT.MD §8 + Figma design system
       ├─ Extracts tokens, variables, components, styles from Figma
       ├─ Builds standalone HTML/CSS with design tokens and WCAG AA
       │
       └─ Pushes to Figma → outputs Figma URL → STOP
```

### Flow 3: TDD Pipeline (Tests First)

```
@orchestrator-tdd #N
  │
  ├─ Read PROJECT_CONTEXT.md + issue
  ├─ Discuss technical approach with user
  ├─ Create .opencode/work/tasks/<id>.md
  ├─ Gate G1: Plan validated
  │
  └─ task(executor-tdd) ──────────── RED PHASE
       │
       ├─ Infer test framework from PROJECT_CONTEXT.md
       ├─ Write ONLY failing tests (mocks/stubs/interfaces)
       ├─ Update task checkboxes for test tasks
       │
       └─ task(executor) ──────────── GREEN PHASE
            │
            ├─ Implement code to pass ALL existing tests
            ├─ Do NOT modify tests (unless genuine error)
            ├─ Add tests for untested edge cases only
            ├─ Run security-checker
            ├─ Gate G3: Implementation & security verified
            │
            └─ task(tester)
                 │
                 ├─ 100% pass? ──YES──→ task(reviewer)
                 │                     │
                 │                     ├─ quick-review + security-checker
                 │                     ├─ lessons-writer
                 │                     ├─ APPROVED → READY_TO_COMMIT → STOP (notify user)
                 │                     └─ CHANGES → task(executor) [loop]
                 │
                 └─ fail? ──→ task(executor) [loop]
```

### Flow 4: Standard Pipeline (Code + Tests Together)

```
@orchestrator-nontdd #N
  │
  ├─ Read PROJECT_CONTEXT.md + issue
  ├─ Discuss technical approach with user
  ├─ Create .opencode/work/tasks/<id>.md
  ├─ Gate G1: Plan validated
  │
  └─ task(executor) ──────────── IMPLEMENT + TEST
       │
       ├─ Implement all tasks from plan
       ├─ Generate tests via test-generator
       ├─ Run security-checker
       ├─ Gate G3: Implementation & security verified
       │
       └─ task(tester) → task(reviewer) → [same as TDD flow]
```

### Flow 5: Hotfix (Emergency Bypass)

```
@hotfix #N
  │
  ├─ Create .opencode/work/tasks/<id>.md (minimal hotfix template)
  │
  └─ task(executor)
       │
       ├─ 15-minute investigation time-box
       ├─ Minimal fix + regression test
       ├─ Abbreviated security check
       │
       └─ task(tester) → task(reviewer) → READY_TO_COMMIT
```

### Flow 6: Standalone Planning (No Execution)

```
@plan-maker #N
  │
  ├─ Read PROJECT_CONTEXT.md + issue
  ├─ Discuss technical approach with user
  ├─ Create .opencode/work/tasks/<id>.md
  ├─ Gate G1: Plan validated
  │
  └─ STOP (user decides next step manually)
```

### Status Lifecycle

```
PLANNING → IN_PROGRESS → TESTING → REVIEW → READY_TO_COMMIT → DONE
```

---

## Agent Team

| # | Agent | Mode | Role | Model |
|---|-------|------|------|-------|
| 1 | `project-setup` | primary | Architecture & PROJECT_CONTEXT.md | claude-sonnet-4-6 |
| 2 | `product-manager` | primary | Product, UX, scope, business rules | kimi-k2.6 |
| 3 | `issue-crafter` | primary | Standardized GitHub issues (REQ + TECH) | claude-sonnet-4-6 |
| 4 | `designer` | primary | Requirements → design system → HTML → Figma | claude-sonnet-4-6 |
| 5 | `plan-maker` | primary | Detailed plan in .md, STOPS (no execution) | deepseek-v4-pro |
| 6 | `orchestrator-tdd` | primary | Plan + delegate to executor-tdd | deepseek-v4-pro |
| 7 | `orchestrator-nontdd` | primary | Plan + delegate to executor | deepseek-v4-pro |
| 8 | `hotfix` | primary | Emergency bypass for production | deepseek-v4-flash |
| 9 | `executor-tdd` | subagent | Writes ONLY failing tests (red phase) | claude-sonnet-4-6 |
| 10 | `executor` | subagent | Implements code (with or without pre-existing tests) | claude-sonnet-4-6 |
| 11 | `tester` | subagent | Full suite execution, 100% pass gate | glm-5.1 |
| 12 | `reviewer` | subagent | Code review, security, marks READY_TO_COMMIT | deepseek-v4-pro |
| 13 | `committer` | primary | Commit, push, PR — **requires explicit user approval** | minimax-m2.7 |

**All 13 agents have `task` tool access** for spawning subagents to parallelize independent work.

**12/13 agents have `figma_*` and `firecrawl_*` MCP access.** Only `committer` lacks them (purely operational). Every planning, discovery, implementation, design, and review agent can access Figma designs and web research.

**All 13 agents read the ENTIRE `PROJECT_CONTEXT.md` before any action.** They trust it as the single source of truth — architecture, data model, dev commands, conventions, testing strategy, auth rules, and lessons learned. Source code is only read directly when the context lacks implementation-specific detail.

---

## Quick Start

### Step 0: Project Setup

```
@project-setup            # first run — creates PROJECT_CONTEXT.md
@project-setup            # any time after — fills gaps or updates sections
```

Analyzes codebase, detects tech stack, guides architecture decisions, creates or updates `PROJECT_CONTEXT.md`. **Re-invocable** — run any time to add missing information.

**Quick mode:**
```
@project-setup --quick
```

### Option A: Full Product-to-PR flow

```
@product-manager              # discuss scope, UX, business rules
@issue-crafter                # create standardized GitHub issue
@orchestrator-tdd #<number>   # TDD pipeline (tests first)
@orchestrator-nontdd #<num>   # OR standard pipeline

# Pipeline runs automatically: executor → tester → reviewer
# When reviewer marks READY_TO_COMMIT:
@committer .opencode/work/tasks/<id>.md
```

### Option B: Prompt-only (no GitHub issue)

```
@orchestrator-tdd add JWT authentication to the API
@orchestrator-nontdd add password reset flow
@plan-maker refactor the payment module   # plan only, no execution
```

### Option C: Hotfix (production emergency)

```
@hotfix #<issue-number>
```

---

## Solo Agents (Foundation & Operations)

These agents operate independently and **STOP** after completing their task. They do NOT trigger downstream pipelines.

### project-setup

**Role:** Arquiteto. Analyzes the codebase, detects the tech stack, defines architecture patterns and data models, creates and maintains the foundational `PROJECT_CONTEXT.md`. **Re-invocable** — run any time to fill gaps or update context.

**Invoke:** `@project-setup` (first run or any subsequent update)

**Two modes:**
- **Mode A (First Run):** No PROJECT_CONTEXT.md exists → full interactive setup, detects stack, asks all questions, creates the file from scratch.
- **Mode B (Update Run):** File exists → analyzes which sections are filled vs missing → shows gap report → user picks which sections to update → only asks about those gaps.

**Key rules:**
- Reads all config files in parallel via `task()` subagents
- In update mode, never overwrites existing data silently — shows diff before writing
- One question at a time — never overwhelms the user
- Explicit user approval required before writing
- Uses the standard 10-section template that all other agents depend on

---

### product-manager

**Role:** Product & UX discovery. Discusses ideas, scope, and business rules with the user BEFORE any code is written. Uses real product management frameworks to refine WHAT needs to be built.

**Invoke:** `@product-manager`

**Product Management Toolkit:**
- **Personas** — Detailed user profiles (name, role, goals, frustrations, context)
- **Jobs to be Done (JTBD)** — What job is the user hiring this feature to do?
- **User Journey Map** — Step-by-step flow: Trigger → Steps → Outcome → Follow-up
- **Happy Path & Error States** — Ideal flow first, then edge cases (network fail, empty state, invalid input, permissions)
- **MoSCoW Prioritization** — Must-have / Should-have / Could-have / Won't-have (v1)
- **Success Metrics** — North Star, KPIs, OKRs (adoption, retention, conversion, time saved)
- **Risk Assessment** — Technical, UX, business, adoption risks
- **Competitive Analysis** — What similar products do well/poorly, differentiation

**Challenge techniques:** Five Whys, kill the feature, invert the assumption, time-box the scope, pre-mortem

**Key rules:**
- Reads `PROJECT_CONTEXT.md` first — never proposes features that violate the architecture
- **Gathers context from 4 sources before speaking:** PROJECT_CONTEXT.md, `.opencode/work/docs/` folder (briefs, journeys), GitHub Issues (related/blocking), and repo structure (existing modules)
- Parallelizes all context gathering via `task()` subagents
- Never writes code or creates GitHub issues
- **MANDATORY at end of every conversation:** offers to generate a document (Feature Brief or custom format)
- **MANDATORY at end of every conversation:** offers to generate a document (Project Brief or custom format)
- Document format adapts to what was discussed — requirements, KPIs, journey maps, vision docs, competitive analysis
- User can specify the format or let the agent choose the best one
- One area per message — natural dialogue, not questionnaires
- Outputs a structured Product Discovery Summary with MoSCoW table, edge cases, risks, and metrics

---

### issue-crafter

**Role:** Creates standardized GitHub issues (REQ + TECH) optimized for the orchestrator agents. Handles both single and multi-item inputs.

**Invoke:** `@issue-crafter`

**Input modes:**
- **Single item:** "Add password reset" → one conversation → one issue
- **Multi-item / list:** "1. Login Google, 2. Dashboard, 3. CSV export" → detects 3 items → asks: "Separate issues or grouped?" → drafts all in parallel via `task()` → batch approval → creates sequentially

**Issue format (standard):**
- Title: `[TYPE] Concise imperative description`
- Body: User Story (`As a... I want... so that...`), Description, Acceptance Criteria (mandatory, testable), Business Rules, Technical Requirements, Design References, Dependencies, Notes
- Labels: type + scope + priority
- Assignee: `@me`

**Key rules:**
- Reads `PROJECT_CONTEXT.md` first
- Consumes `product-manager` context and `project-brief` documents when available
- Parallelizes all context reading and issue drafting via `task()` subagents
- Never creates issues without explicit user approval
- Acceptance criteria are mandatory — each must be specific and testable

---

### designer

**Role:** Senior Product Designer. Consumes Feature Briefs and requirements, reads the Figma design system (tokens, variables, components, styles), builds production-grade HTML with design tokens and accessibility, then pushes directly into Figma.

**Invoke:** `@designer .opencode/work/docs/feature-brief-*.md` or `@designer "Create a login page with Google OAuth"`

**Flow:** Requirements → Design system analysis → HTML/CSS → Figma insert

**Key rules:**
- Reads Feature Briefs, PROJECT_CONTEXT.MD §8, and the Figma design system simultaneously via `task()` subagents
- Extracts ALL design tokens from Figma (colors, spacing, typography, radii, shadows) before designing
- Reuses existing Figma components — never invents new tokens unless explicitly asked
- Builds standalone HTML/CSS only — no React/Vue/application code
- Every screen MUST be published to Figma via `html-to-figma` skill or `figma_generate_figma_design`
- All HTML uses semantic HTML5, WCAG AA accessibility, auto-layout (flexbox/grid), and responsive breakpoints

**Skills:** `frontend-design`, `html-to-figma`, `figma-implement-design`

---

### committer

**Role:** Creates standardized, layer-split commits, pushes branches, and opens Pull Requests. **Manual trigger only.**

**Invoke:** `@committer .opencode/work/tasks/<id>.md`

**GOLDEN RULE — Commit Plan + Approval:**
1. Analyzes all changed files and classifies them by layer: **Infra/Types**, **Business Logic/Services**, **UI/Interface**, **Tests**
2. Drafts a **Commit Plan** — one conventional commit per layer with affected changes
3. Presents the full plan to the user: "Can I proceed with this commit plan?"
4. **STOP and WAIT** for explicit user approval
5. After approval: creates each commit sequentially using `git add <specific files>` (never `git add .`), pushes, and opens the PR

**If the task spans only one layer, one commit is acceptable.** Defaults to split commits when changes span 2+ layers.

**Skills:** `commit-changes`, `push-changes`, `create-pr`, `pr-description`

---

## Multi Agents (Development Pipeline)

These agents form chains. Each agent in the pipeline handles its own handoff via `task()`.

### plan-maker

**Role:** Standalone planner. Creates a detailed `.opencode/work/tasks/<id>.md` and **STOPS**. Does NOT delegate to any executor.

**Invoke:** `@plan-maker #N` or `@plan-maker <prompt>`

**When to use:** When you want to review and discuss the plan BEFORE choosing TDD vs standard execution.

**Skills:** `issue-reader`, `todo-manager`

---

### orchestrator-tdd

**Role:** Planner + TDD pipeline initiator. Creates `.opencode/work/tasks/<id>.md` and delegates to `executor-tdd`.

**Invoke:** `@orchestrator-tdd #N` or `@orchestrator-tdd <prompt>`

**Key rules:**
- Reads `PROJECT_CONTEXT.md` first
- Discusses technical approach with user (skipped for hotfix/.opencode/work/docs/chore/test)
- Delegates via `task()` to `executor-tdd` (NOT `executor`)
- Pipeline continues autonomously: `executor-tdd` → `executor` → `tester` → `reviewer`

**Skills:** `issue-reader`, `todo-manager`

---

### orchestrator-nontdd

**Role:** Planner + standard pipeline initiator. Creates `.opencode/work/tasks/<id>.md` and delegates to `executor`.

**Invoke:** `@orchestrator-nontdd #N` or `@orchestrator-nontdd <prompt>`

**Key rules:**
- Same planning workflow as `orchestrator-tdd`
- Delegates via `task()` to `executor` (implementation + tests together)
- Pipeline continues autonomously: `executor` → `tester` → `reviewer`

**Skills:** `issue-reader`, `todo-manager`

---

### hotfix

**Role:** Emergency bypass for critical production issues.

**Invoke:** `@hotfix #<issue-number>`

**Key rules:**
- Creates minimal `.opencode/work/tasks/<id>.md` with hotfix template
- Delegates to `executor` with 15-minute investigation time-box
- Abbreviated quality gates (regression test required, full coverage deferred)
- Monitors post-deployment, creates follow-up issues for root cause analysis

**Skills:** `hotfix-mode`

---

### executor-tdd

**Role:** TDD test writer (Red Phase). Writes ONLY failing tests — never implementation code.

**Invoked by:** `orchestrator-tdd` via `task()`

**Key rules:**
- Reads `PROJECT_CONTEXT.md` to infer the correct test framework (stack-agnostic)
- Tests MUST fail initially — validates the test is meaningful
- Uses mocks, stubs, and interfaces for dependencies that don't exist yet
- Parallelizes test writing across modules via `task()` subagents
- After all tests are written, delegates to `executor` via `task()` with clear prompt: "Implement code to pass these failing tests"

**Skills:** `test-generator`

---

### executor

**Role:** Staff engineer implementer. Works in two modes depending on context.

**Invoked by:** `orchestrator-nontdd`, `orchestrator-tdd` (via `executor-tdd`), `hotfix`, `tester` (on failure), `reviewer` (on changes requested)

**Execution Modes:**

| Mode | Trigger | Behavior |
|------|---------|----------|
| **A: TDD Green Phase** | Called by `executor-tdd` | Tests already exist and are FAILING. Implement production code to pass ALL tests. Do NOT modify existing tests. Add tests only for untested edge cases. |
| **B: Standard** | Called by `orchestrator-nontdd` or `hotfix` | No pre-existing tests. Implement code AND generate tests together. |

**Key rules:**
- Reads `.opencode/work/tasks/<id>.md` + `PROJECT_CONTEXT.md`
- Parallelizes implementation across independent modules via `task()` subagents
- Mandatory `security-checker` on all changed files
- After completion: delegate to `tester` via `task()`

**Skills:** `senior-engineer-executor`, `test-generator`, `security-checker`, `frontend-design`, `figma-implement-design`, `db-migrator`

---

### tester

**Role:** Executes the full test suite. **100% pass requirement** — zero failures tolerated.

**Invoked by:** `executor` via `task()`

**Key rules:**
- Reads `PROJECT_CONTEXT.md` for test commands (stack-agnostic)
- Parallelizes test execution via `task()` subagents (unit + integration in parallel)
- **Gate G4:** 100% tests pass + coverage >= 80%
- PASS → delegate to `reviewer` via `task()`
- FAIL → return to `executor` via `task()` with detailed failure log

**Skills:** `test-runner`, `test-logger`, `coverage-reporter`

---

### reviewer

**Role:** Senior code review, final security scan, marks `READY_TO_COMMIT` and **STOPS**. Does NOT auto-commit.

**Invoked by:** `tester` via `task()`

**Key rules:**
- Reads `PROJECT_CONTEXT.md` to enforce architecture and conventions
- Parallelizes review operations: `quick-review` + `security-checker` in parallel subagents
- Verifies test evidence exists in the task file
- APPROVED → mark `READY_TO_COMMIT`, notify user, **STOP**
- CHANGES → return to `executor` via `task()` with specific issues

**Skills:** `quick-review`, `security-checker`, `lessons-writer`

---

## Quality Gates

| Gate | Owner | Requirements |
|------|-------|-------------|
| **G1** | plan-maker / orchestrator-tdd / orchestrator-nontdd | Task file exists, problem clear, criteria defined, tasks listed |
| **G3** | executor | All checkboxes `[x]`, tests created/verified, security passed |
| **G4** | tester | **100% tests pass** (zero failures) + coverage >= 80% + logs saved |
| **G5** | reviewer | Review complete, security passed, no HIGH issues |

**Hotfix gates (abbreviated):**
- G3: Fix + regression test + abbreviated security
- G4: Affected tests pass + regression test passes
- G5: Quick security scan + regression test verified

---

## GitHub Issues & Labels Standard

### Issue Title Format

```
<type>: <short imperative description>
```

### Issue Body Format

```markdown
## User Story
As a <role>, I want <feature> so that <benefit>

## Description
<detailed description — what, why, scope, context>

## Acceptance Criteria
- [ ] <specific, testable, measurable criterion>
- [ ] <specific, testable, measurable criterion>

## Business Rules
- <domain logic, validations, workflow constraints — or N/A>

## Technical Requirements
<constraints, architectural rules from PROJECT_CONTEXT.md>

## Design References
<Figma links, mockups — or N/A>

## Dependencies
- Related to: #<num> (if any)
- Blocked by: #<num> (if any)

## Notes
<edge cases, non-functional requirements, security considerations>
```

### Labels

| Group | Labels |
|-------|--------|
| **Type** | `feature`, `bug`, `refactor`, `docs`, `test`, `chore` |
| **Scope** | `scope:frontend`, `scope:backend`, `scope:full-stack`, `scope:infrastructure` |
| **Priority** | `priority:high`, `priority:medium`, `priority:low` |
| **Special** | `hotfix`, `urgent`, `blocked`, `needs-clarification` |

### Branch Naming

```
<type>/<id>-<short-desc>
```

### Commit Convention

[Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

---

## Skills Reference

| Skill | Used By | What It Does |
|-------|---------|-------------|
| `feature-brief` | product-manager | Generates structured Feature Brief docs at `.opencode/work/docs/feature-brief-*.md` (User Story, MoSCoW, rules, edge cases, metrics) |
| `project-brief` | product-manager | Generates structured Project Brief docs at `.opencode/work/docs/project-brief-*.md` (vision, stack, architecture) |
| `issue-reader` | plan-maker, orchestrator-tdd, orchestrator-nontdd | Parses GitHub issues into structured intake |
| `todo-manager` | plan-maker, orchestrator-tdd, orchestrator-nontdd | Task tracking via unified task file |
| `test-generator` | executor-tdd, executor | Generates tests (supports TDD-first and standard modes) |
| `test-runner` | tester | Executes test suite, enforces 100% pass |
| `test-logger` | tester | Saves results to `.opencode/work/logs/` |
| `coverage-reporter` | tester | Generates coverage reports |
| `security-checker` | executor, reviewer | OWASP security checks |
| `senior-engineer-executor` | executor | Implementation workflow (dual mode: TDD green phase + standard) |
| `hotfix-mode` | hotfix | Expedited fix workflow, bypasses full planning |
| `figma-implement-design` | executor | Translates Figma designs into production code |
| `html-to-figma` | executor | Builds HTML screens with market-standard design, inserts into Figma |
| `frontend-design` | executor | Design system tokens, accessibility, aesthetics |
| `db-migrator` | executor | Database migration planning |
| `quick-review` | reviewer | Structured code review |
| `code-reviewer` | reviewer | Full code review workflow |
| `lessons-writer` | executor, reviewer | Appends learnings to PROJECT_CONTEXT.md |
| `commit-changes` | committer | Creates conventional commit |
| `push-changes` | committer | Creates branch, pushes |
| `create-pr` | committer | Opens PR with evidence |
| `pr-description` | committer | Formats PR body |

---

## File Structure

```
.env.example
.opencode/
├── opencode.json               # MCP configuration
├── agents/
│   ├── project-setup.md
│   ├── product-manager.md
│   ├── issue-crafter.md
│   ├── plan-maker.md
│   ├── orchestrator-tdd.md
│   ├── orchestrator-nontdd.md
│   ├── hotfix.md
│   ├── executor-tdd.md
│   ├── executor.md
│   ├── tester.md
│   ├── reviewer.md
│   └── committer.md
├── skills/
│   ├── project-brief/
│   ├── issue-reader/
│   ├── todo-manager/
│   ├── test-generator/
│   ├── test-runner/
│   ├── test-logger/
│   ├── coverage-reporter/
│   ├── security-checker/
│   ├── senior-engineer-executor/
│   ├── hotfix-mode/
│   ├── figma-implement-design/
│   ├── html-to-figma/
│   ├── frontend-design/
│   ├── db-migrator/
│   ├── quick-review/
│   ├── code-reviewer/
│   ├── lessons-writer/
│   ├── commit-changes/
│   ├── push-changes/
│   ├── create-pr/
│   └── pr-description/
└── work/
    ├── tasks/
    │   └── <id>.md                 # UNIFIED task file (spec + plan + todos + evidence)
    ├── logs/
    │   ├── test-run-<id>-<ts>.md   # Test execution results
    │   ├── coverage-<id>-<ts>.md   # Coverage report
    │   └── security-<id>-<ts>.md   # Security scan report
    └── docs/
        ├── feature-brief-<name>.md # Feature-level briefs (scope, rules, edge cases)
        ├── project-brief-<name>.md # Project-level briefs (vision, stack, architecture)
        ├── metrics-<name>.md       # KPI / metrics sheets
        ├── journey-<name>.md       # User journey maps
        ├── vision-<name>.md        # Product vision documents
        └── competitive-<name>.md   # Competitive landscape docs
```

**Identifier convention:**

| Trigger | `<id>` | Example |
|---------|--------|---------|
| `@orchestrator-* #42` | `issue-42` | `.opencode/work/tasks/issue-42.md` |
| `@orchestrator-* <prompt>` | `task-<slug>` | `.opencode/work/tasks/task-add-jwt-auth.md` |

---

## Parallelization Model

**Every agent in this template is explicitly instructed to parallelize independent work via `task()` subagents.**

| Agent | Parallelization Strategy |
|-------|-------------------------|
| `project-setup` | Read config files for frontend, backend, infra simultaneously |
| `product-manager` | Research competitors, read docs, analyze market data in parallel |
| `issue-crafter` | Read PROJECT_CONTEXT.md, project briefs, related issues in parallel |
| `plan-maker` | Spawn subagents to search different codebase patterns simultaneously |
| `orchestrator-tdd` | Parallel subagents for broad codebase investigation |
| `orchestrator-nontdd` | Same parallel investigation strategy |
| `executor-tdd` | Write tests for different modules in parallel subagents |
| `executor` | Implement independent modules + run security checks in parallel |
| `tester` | Run unit tests and integration tests simultaneously in separate subagents |
| `reviewer` | Run code review and security scan in parallel subagents |
| `hotfix` | Investigate root cause and check deployments in parallel |
| `committer` | Gather context from git, task file, and logs in parallel; classify files by layer |

This is NOT optional. Each agent's prompt contains explicit `PARALLELIZATION MANDATE` or `PARALLELIZE EVERYTHING` instructions in their HARD RULES section.

---

## Configuration

### Environment Variables

```bash
cp .env.example .env
```

| Variable | Description | How to get it |
|----------|-------------|---------------|
| `FIGMA_CLIENT_ID` | Figma OAuth client ID | [Figma Developer Apps](https://www.figma.com/developers/apps) |
| `FIGMA_CLIENT_SECRET` | Figma OAuth client secret | Same as above |
| `FIRECRAWL_API_KEY` | Firecrawl MCP API key | [Firecrawl](https://www.firecrawl.dev/) |

### opencode.json

The MCP configuration in `.opencode/opencode.json` references environment variables:

```json
{
  "permission": {
    "skill": { "*": "allow" }
  },
  "mcp": {
    "figma": {
      "type": "remote",
      "url": "https://mcp.figma.com/mcp",
      "enabled": true,
      "oauth": {
        "clientId": "${FIGMA_CLIENT_ID}",
        "clientSecret": "${FIGMA_CLIENT_SECRET}"
      }
    },
    "firecrawl": {
      "type": "remote",
      "url": "https://mcp.firecrawl.dev/${FIRECRAWL_API_KEY}/v2/mcp",
      "enabled": true
    }
  }
}
```

### GitHub CLI

```bash
gh auth login
gh auth status
```

---

## Customization

### Add a New Agent

Create `.opencode/agents/my-agent.md` with frontmatter:

```markdown
---
description: What this agent does.
mode: primary | subagent
model: anthropic/claude-sonnet-4-6
tools:
  task: true
  read: true
  glob: true
  grep: true
---
```

### Add a New Skill

Create `.opencode/skills/my-skill/SKILL.md` with frontmatter:

```markdown
---
name: my-skill
description: What this skill does.
---
```

### Change an Agent's Model

Edit the `model:` field in the agent's frontmatter.

---

## Troubleshooting

### Agent not parallelizing

All 13 agents have explicit `PARALLELIZATION MANDATE` instructions. If an agent runs operations sequentially, it may be because the operations have dependencies that prevent parallelization. Independent operations should always be parallelized via `task()`.

### Tests failing at Gate G4

Check `.opencode/work/logs/test-run-<id>-*.md` for details. The tester returns to executor automatically. **100% of tests must pass** — even a single failure blocks the gate.

### Coverage below threshold

Threshold is 80% for new code. The tester returns to executor with the coverage report. Add tests for uncovered paths.

### Task not reaching READY_TO_COMMIT

Check `.opencode/work/tasks/<id>.md` — verify all checkboxes are `[x]` and Evidence section is filled. The task must pass through `executor → tester → reviewer` in order.

### PR creation fails

- Run `gh auth status` to verify GitHub CLI authentication
- Confirm task status is `READY_TO_COMMIT` in `.opencode/work/tasks/<id>.md`
- The committer will present a Commit Plan and ask for approval — you must confirm in chat

### Agent confusion about TDD vs Standard mode

- `executor-tdd` writes ONLY tests (red phase)
- `executor` checks if tests exist → Mode A (green phase, don't modify tests) or Mode B (standard, implement + generate tests)
- If the wrong agent is triggered, restart with the correct orchestrator
