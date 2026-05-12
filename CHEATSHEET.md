# OpenCode Cheat Sheet

> Quick reference for when to use what. Copy-paste commands. No fluff.

---

## Decision Tree: Which Agent Do I Call?

```
I have an...                               →  Use this agent
═══════════════════════════════════════════════════════════════════
🆕 New project (no code yet)               →  @project-setup
💡 Vague idea, need to refine scope        →  @product-manager
🎨 Need a screen designed in Figma          →  @designer .opencode/work/docs/feature-brief-*.md
📋 Ready to create a GitHub issue          →  @issue-crafter
📋 Multiple items → separate issues        →  @issue-crafter (detects lists)
🛠️ Clear task, ready to code (TDD)         →  @orchestrator-tdd
🛠️ Clear task, ready to code (no TDD)      →  @orchestrator-nontdd
📝 Just want a plan, don't execute          →  @plan-maker
🚨 Production emergency                     →  @hotfix #N
✅ Task approved → commit & PR              →  @committer .opencode/work/tasks/<id>.md
🔄 PROJECT_CONTEXT.md missing info          →  @project-setup (re-invocable)
```

---

## Quick Command Reference

### Setup & Discovery

```bash
@project-setup                    # First run: creates PROJECT_CONTEXT.md
@project-setup                    # Any time: fills gaps in existing file
@project-setup --quick            # Auto-detect, ask once, write
@product-manager                  # "I have an idea but don't know what exactly to build"
@product-manager                  # Refine scope, rules, edge cases, metrics
@issue-crafter                    # Single requirement → one issue
@issue-crafter                    # "1. Login, 2. Dashboard, 3. CSV" → detects list
@issue-crafter .opencode/work/docs/feature-brief-notifications.md   # Create issue FROM a brief

### Design

```bash
@designer .opencode/work/docs/feature-brief-notifications.md          # Brief → design system → HTML → Figma
@designer .opencode/work/docs/feature-brief-notifications.md "add a dark mode toggle"  # Brief + extra context
@designer "Create a login page with email and Google OAuth"  # Text description → design
```
```

### Development Pipelines

```bash
# TDD (tests first, then implementation)
@orchestrator-tdd #42
@orchestrator-tdd "add JWT auth to the API"

# Standard (implement + tests together)
@orchestrator-nontdd #42
@orchestrator-nontdd "add password reset flow"

# Plan only (no execution — review before deciding)
@plan-maker #42
@plan-maker "refactor the payment module"

# Hotfix (emergency bypass)
@hotfix #42
```

### Commit & PR

```bash
@committer .opencode/work/tasks/issue-42.md       # Analyzes changes → drafts Commit Plan (multiple commits by layer)
                                           # Presents plan → WAITS for approval → creates commits + push + PR
```

---

## The 6 Flows at a Glance

| Flow | Trigger | Pipeline |
|------|---------|----------|
| **Product → Issue** | `@product-manager` → `@issue-crafter` | Discuss → Doc → Issue |
| **Requirements → Figma** | `@designer` | Brief → Design system → HTML → Figma insert |
| **TDD Pipeline** | `@orchestrator-tdd` | Plan → `executor-tdd` (tests) → `executor` (code) → `tester` → `reviewer` |
| **Standard Pipeline** | `@orchestrator-nontdd` | Plan → `executor` (code+tests) → `tester` → `reviewer` |
| **Hotfix** | `@hotfix #N` | Minimal plan → `executor` → `tester` → `reviewer` |
| **Plan Only** | `@plan-maker` | Plan → **STOP** (you decide next) |

---

## Agent Roles (13 agents)

| Agent | Does | Does NOT |
|-------|------|----------|
| `project-setup` | Creates/manages PROJECT_CONTEXT.md | Write code, plan features |
| `product-manager` | Refines WHAT to build (scope, rules, metrics) | Write code, create issues |
| `designer` | Brief → design system → HTML → Figma | Write app code (React/Vue/etc) |
| `issue-crafter` | Creates GitHub issues from requirements | Write code, implement |
| `plan-maker` | Creates `.opencode/work/tasks/<id>.md` plan | Execute, delegate to executor |
| `orchestrator-tdd` | Plan + delegate to executor-tdd | Write code, implement |
| `orchestrator-nontdd` | Plan + delegate to executor | Write code, implement |
| `executor-tdd` | Write ONLY failing tests (red phase) | Write implementation code |
| `executor` | Implement code (green phase or standard) | Delegate to tester before done |
| `tester` | Run test suite, 100% pass gate | Approve code (that's reviewer) |
| `reviewer` | Code review + security + READY_TO_COMMIT | Commit, push, create PR |
| `committer` | Commit Plan by layer + push + PR (manual, asks approval) | Auto-commit without asking |
| `hotfix` | Emergency production fix flow | Full planning, full coverage |

---

## Quality Gates

| Gate | Who | Pass Condition |
|------|-----|---------------|
| G1 | orchestrator/plan-maker | Plan file exists, clear, complete |
| G3 | executor | All tasks done, tests exist, security passed |
| G4 | tester | **100% tests pass** + coverage ≥ 80% |
| G5 | reviewer | Code quality OK, security clean, no HIGH issues |

After G5 → `READY_TO_COMMIT` → you call `@committer`.

---

## Key Documents

| Document | Created By | When |
|----------|-----------|------|
| `PROJECT_CONTEXT.md` | `@project-setup` | Project start (re-invocable) |
| `.opencode/work/docs/feature-brief-*.md` | `@product-manager` | End of every feature discussion |
| `.opencode/work/docs/project-brief-*.md` | `@product-manager` | New project/product idea |
| `.opencode/work/tasks/<id>.md` | orchestrator/plan-maker | Every development task |
| `.opencode/work/logs/test-run-*.md` | `@tester` | After test execution |
| `.opencode/work/logs/coverage-*.md` | `@tester` | After coverage analysis |
| `.opencode/work/logs/security-*.md` | executor/reviewer | After security scan |
| Figma HTML files | `@designer` | During design creation (temp, then pushed to Figma) |

---

## Core Rules (All Agents)

| Rule | Meaning |
|------|---------|
| 📖 Read `PROJECT_CONTEXT.md` first | Never act without context |
| 🔀 Parallelize with `task()` | Independent work = simultaneous subagents |
| 📄 Trust the context | Only read code directly when context is insufficient |
| 🛑 Never auto-commit | Committer presents Commit Plan, MUST ask explicit user approval |
| ✅ 100% tests pass | G4 gate blocks on ANY test failure |
| 🔒 Explicit approval | project-setup, issue-crafter, committer all require it |
| 🧠 AI suggests, you decide | Orchestrators/plan-maker never choose tech approach autonomously |

---

## Common Patterns

### "I have an idea, what do I do?"
```
@product-manager
→ discuss scope, users, flows, edge cases, metrics
→ agent asks: "Want me to generate a document?"
→ pick Feature Brief (for features) or Project Brief (for new projects)
→ agent outputs: "@issue-crafter .opencode/work/docs/feature-brief-<name>.md"
→ copy-paste that command

# OPTIONAL: See the design before coding
@designer .opencode/work/docs/feature-brief-notifications.md
→ reads brief + design system → HTML → Figma → outputs Figma URL

@issue-crafter .opencode/work/docs/feature-brief-<name>.md
→ agent reads the brief, drafts the issue, asks for approval
→ creates GitHub issue
→ agent outputs: "@orchestrator-tdd #N"
→ copy-paste that command
@orchestrator-tdd #N
→ pipeline runs automatically: plan → tests → code → tester → reviewer
→ when reviewer says READY_TO_COMMIT:
@committer .opencode/work/tasks/issue-N.md
→ committer classifies files by layer (Infra → Logic → UI → Tests)
→ presents Commit Plan (multiple commits) → asks approval → creates commits + PR
```
### "I know exactly what I need"
```
@orchestrator-nontdd "add export CSV to the reports page"
→ plan → code + tests → tester → reviewer → READY_TO_COMMIT
@committer .opencode/work/tasks/task-add-export-csv.md
→ classifies files → drafts Commit Plan by layer → asks approval → commits + PR
```

### "Just make a plan, I'll review before coding"
```
@plan-maker "migrate auth from JWT to OAuth2"
→ creates .opencode/work/tasks/<id>.md
→ STOP — read the plan, then decide:
   @orchestrator-tdd .opencode/work/tasks/<id>.md
   @orchestrator-nontdd .opencode/work/tasks/<id>.md
```

### "I have a brief, I want to see the design"
```
@designer .opencode/work/docs/feature-brief-notifications.md
→ reads brief + PROJECT_CONTEXT.MD §8 + Figma design system
→ extracts tokens, colors, spacing, components
→ builds HTML with design tokens, auto-layout, WCAG AA
→ pushes to Figma → outputs Figma URL
```

### "Production is broken"
```
@hotfix #42
→ 15-min investigation → minimal fix + regression test → tester → reviewer
→ READY_TO_COMMIT
@committer .opencode/work/tasks/issue-42.md
```

### "I need to update PROJECT_CONTEXT.md"
```
@project-setup
→ agent reads existing file → shows gap report:
   §2 missing (7 fields), §4 empty, §6 missing
→ you pick: "update §2 and §6"
→ agent asks only about those sections
→ writes merged file
```

---

## Issue Format

```markdown
## User Story
As a <role>, I want <feature> so that <benefit>

## Description
<what, why, scope>

## Acceptance Criteria
- [ ] <specific, testable, measurable>
- [ ] <specific, testable, measurable>

## Business Rules
- <domain logic, validations>

## Technical Requirements
<constraints from PROJECT_CONTEXT.md>

## Design References
<Figma or N/A>

## Dependencies
- Related to: #N
- Blocked by: #N

## Notes
<edge cases, security, extra context>
```
