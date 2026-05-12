---
name: lessons-writer
description: Updates PROJECT_CONTEXT.md with lessons learned, patterns discovered, architecture decisions, and conventions changes. Called by all agents after iterations.
---

## Context Updater Skill

**Purpose:** Keep PROJECT_CONTEXT.md synchronized with the project as it evolves. All agents call this skill when they discover new patterns, conventions, or learnings.

---

### When to Use (ALL AGENTS MUST CALL THIS)

**MANDATORY triggers:**
1. After ANY correction from user or reviewer
2. When discovering a non-obvious solution
3. When encountering a gotcha or edge case
4. After resolving a difficult bug
5. When a pattern emerges that should be documented
6. When architecture decisions are made
7. When coding conventions change
8. When new libraries/tools are added to the stack
9. At the end of each issue/feature completion (reviewer agent)
10. When reviewer finds something that should be a project rule

---

### What Gets Updated

PROJECT_CONTEXT.md has 10 sections. This skill can update:

| Section | What Goes Here | Who Updates |
|---------|----------------|-------------|
| 1. Project Overview | New features, scope changes | Orchestrator (major changes) |
| 2. Technology Stack | New libraries, framework upgrades | Planner (stack changes) |
| 3. Architecture and Patterns | New patterns, architecture decisions | Orchestrator, Planner |
| 4. Coding Standards | New conventions, linting rules | Reviewer (convention changes) |
| 5. Feature-Specific Guidelines | Domain-specific rules | Executor (domain patterns) |
| 6. Development Workflow Rules | Process improvements | Reviewer (workflow changes) |
| 7. Common Patterns and Examples | New patterns discovered | Executor, Reviewer |
| 8. Project-Specific Rules | New project constraints | Orchestrator (constraints) |
| 9. When in Doubt | Heuristics and principles | Reviewer (principles) |
| 10. Lessons Learned | Patterns, pitfalls, tips | All agents (learnings) |

---

### How to Update

#### Step 1: Identify What Changed

Ask yourself:
- Did I discover a new pattern? → Section 7 or 10
- Did conventions change? → Section 4
- New library added? → Section 2
- Architecture decision made? → Section 3
- Bug fix that others should know about? → Section 10
- Performance optimization? → Section 10
- Security vulnerability found? → Section 10
- New project rule? → Section 8

#### Step 2: Read Current Content

```bash
# Read the relevant section
cat PROJECT_CONTEXT.md
```

#### Step 3: Append or Update

**For Section 10 (Lessons Learned):**
- Always APPEND, never overwrite
- Use the format below

**For Other Sections:**
- UPDATE existing content if conventions changed
- APPEND if adding new information
- NEVER remove without explicit reason

#### Step 4: Write the Update

**Section 10 Format (Lessons Learned):**

```markdown
### [Date] - [Category]: [Title]

**Context:** <when this applies>
**Discovery:** <what was learned>
**Solution:** <how to handle it>
**Example:**
```<language>
<code example if relevant>
```
**Source:** Issue #<num> or "User correction" or "Code review"
```

**Architecture Decision Format (Section 3):**

```markdown
### [Decision Name]
**Date:** <date>
**Decision:** <what was decided>
**Rationale:** <why>
**Alternatives Considered:** <what else was considered>
**Consequences:** <impact on codebase>
**Source:** Issue #<num>
```

**Convention Change Format (Section 4):**

```markdown
### [Convention Name] (Updated <date>)
**Previous:** <old convention>
**New:** <new convention>
**Reason:** <why changed>
**Migration:** <how to update existing code>
**Source:** Issue #<num>
```

---

### Example Updates

#### Example 1: Bug Discovery → Section 10

```markdown
### 2024-01-15 - Common Pitfalls: Race Condition in User Session

**Context:** Implementing JWT refresh tokens
**Discovery:** Multiple concurrent requests could refresh the same token, causing invalidation
**Solution:** Added mutex lock around token refresh logic
**Example:**
```go
var tokenRefreshMutex sync.Mutex

func refreshToken(userID string) (*Token, error) {
    tokenRefreshMutex.Lock()
    defer tokenRefreshMutex.Unlock()
    // ... refresh logic
}
```
**Source:** Issue #42
```

#### Example 2: New Library → Section 2

```markdown
### Added 2024-01-15:* **Zod:** v3.22 - Runtime validation for API inputs
  - Used for: Request validation, type inference
  - Convention: Define schemas in `src/schemas/` directory
```

#### Example 3: Architecture Decision → Section 3

```markdown
### Event-Driven Architecture for Order Processing (Added 2024-01-15)

**Date:** 2024-01-15
**Decision:** Use event-driven architecture for order processing
**Rationale:** Orders require multiple steps (payment, inventory, shipping) that can fail independently
**Alternatives Considered:** Saga pattern, 2PC transactions
**Consequences:** Eventual consistency, need for idempotent handlers
**Source:** Issue #50
```

---

### Agent Responsibilities

#### Orchestrator
- Updates Section 1 when scope changes significantly
- Updates Section 3 for architecture decisions
- Updates Section 8 for new constraints

#### Executor
- Updates Section 2 when new libraries are added
- Updates Section 3 for pattern decisions

#### Executor
- Updates Section 5 for domain-specific patterns
- Updates Section 7 for code examples
- Updates Section 10 for learnings

#### Reviewer
- Updates Section 4 for convention changes
- Updates Section 6 for workflow improvements
- Updates Section 9 for principles
- Updates Section 10 for all review findings

#### Committer
- Updates Section 2 for dependency changes (in commit message)

---

### Output Format

After updating PROJECT_CONTEXT.md:

```
## PROJECT_CONTEXT Updated

**Section:** <section number and name>
**Change:** <brief description>
**Reason:** <why this change was needed>

Summary: <one-line summary>
```

---

### Rules

1. **ALWAYS append to Section 10** — never delete lessons
2. **ALWAYS date entries** — for traceability
3. **ALWAYS cite the source** — Issue #, PR #, or "User correction"
4. **NEVER overwrite** without explicit reason
5. **READ before updating** — preserve existing content
6. **BE specific** — include code examples when relevant
7. **BE concise** — one paragraph max per entry
8. **NOTIFY user** — tell them what was added

---

### Review Protocol

At session start, ALL agents should:
1. Read `PROJECT_CONTEXT.md` completely
2. Note sections relevant to current work
3. Check Section 10 for recent learnings
4. Apply documented patterns proactively