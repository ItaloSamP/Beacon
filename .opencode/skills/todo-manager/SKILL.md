---
name: todo-manager
description: Manages task tracking in the unified task file (.opencode/work/tasks/<id>.md). Verifies completion gates and blocks progression when tasks are incomplete.
---
## Todo Manager Skill

Central task tracking system for the development workflow. All tracking is done in the **unified task file** — one file per task at `.opencode/work/tasks/<id>.md`.

### File Convention

Each task has ONE file: `.opencode/work/tasks/<id>.md`

Where `<id>` is:
- `issue-<num>` — for GitHub issue-triggered tasks (e.g., `issue-42`)
- `task-<slug>` — for prompt-triggered tasks (e.g., `task-add-jwt-auth`)

**There are NO separate todo files.** The `### Tasks` section inside the unified task file IS the task list.

### Task Format (inside the unified task file)

The orchestrator creates this structure. Other agents update it.

```markdown
# Task: <id> — <title>

## Status: <PLANNING|IN_PROGRESS|TESTING|REVIEW|READY_TO_COMMIT|DONE>

...

## Implementation Plan

### Tasks
- [ ] Task 1: <description>
- [x] Task 2: <description>  (completed)
- [ ] Task 3: <description>

...

## Evidence (filled by tester/reviewer)
- **Test Log:** <path>
- **Coverage:** <path>
- **Security Scan:** <status>
- **Review Verdict:** <APPROVED|CHANGES_REQUESTED>

---
*Last updated: <timestamp>*
*Updated by: <agent-name>*
```

### Operations

#### Initialize Task File
The orchestrator creates `.opencode/work/tasks/<id>.md` with the full structure. No separate init needed.

#### Complete a Task
Mark a checkbox in the `### Tasks` section:
```markdown
- [x] Task 1: <description>
```
Update the `*Last updated*` footer.

#### Check Status
Count completed vs total checkboxes in `### Tasks`:
```
Progress: [████████░░] 80% (8/10 tasks)
Current Phase: IN_PROGRESS
```

#### Update Status
Change the `## Status:` line:
```markdown
## Status: IN_PROGRESS
```

### Gates

#### G1: Orchestrator Gate
- Task file exists: `.opencode/work/tasks/<id>.md`
- Problem Statement is filled
- Acceptance Criteria are defined
- Tasks are listed in `### Tasks`

#### G3: Executor Gate
- All `### Tasks` checkboxes are `[x]`
- Tests created for new code
- No TODO comments left (except intentional with issue ref)
- Security check passed

#### G4: Tester Gate
- All tests pass
- Coverage >= threshold (default 80%)
- Test logs saved to `.opencode/work/logs/`
- Evidence section updated in task file

#### G5: Reviewer Gate
- Code review complete
- Security scan passed
- No HIGH severity issues
- Status = READY_TO_COMMIT

### Status Transitions
```
PLANNING → IN_PROGRESS → TESTING → REVIEW → READY_TO_COMMIT → DONE
```

Only allowed transitions:
- PLANNING → IN_PROGRESS (executor starts work)
- IN_PROGRESS → TESTING (executor finishes, tester starts)
- TESTING → IN_PROGRESS (tests fail, return to executor)
- TESTING → REVIEW (G4 passes, reviewer starts)
- REVIEW → IN_PROGRESS (changes requested, return to executor)
- REVIEW → READY_TO_COMMIT (G5 passes)
- READY_TO_COMMIT → DONE (after user runs @committer)

### Blocking Behavior
**CRITICAL**: If a gate check fails, the workflow MUST stop.

Output format for blocked gate:
```
## GATE BLOCKED: <gate-name>

**Missing requirements:**
- [ ] <requirement 1>
- [ ] <requirement 2>

**Action required:** <what needs to be done>
**Return to:** <agent that should fix this>
```

### Usage Examples

**Orchestrator creating task file:**
```
Create .opencode/work/tasks/issue-42.md with the full unified structure
```

**Executor completing a task:**
```
Mark "Implement login endpoint" as done in .opencode/work/tasks/issue-42.md
```

**Tester checking gate:**
```
Verify gate G4 for .opencode/work/tasks/issue-42.md
```

### Output
Always output current status after any operation:
```
## Task Status: <id>

Progress: [████████░░] 80% (8/10 tasks)
Current Phase: IN_PROGRESS
Pending Tasks:
- [ ] Write E2E tests
- [ ] Update documentation

Gate G3: PENDING (awaiting task completion)
```
