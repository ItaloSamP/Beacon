---
name: hotfix-mode
description: Expedited workflow for critical production fixes, bypassing normal planning stages while maintaining quality gates.
---
## Hotfix Mode Skill

Fast-track workflow for urgent production issues that require immediate attention.

### When to Use
- Production is down or severely degraded
- Critical security vulnerability discovered
- Data corruption or loss occurring
- SLA breach imminent
- User explicitly flags as URGENT/HOTFIX

### When NOT to Use
- Feature requests (no matter how "urgent")
- Non-critical bugs
- Performance improvements
- Refactoring needs

### Hotfix Workflow

```
┌─────────────────────────────────────────────────────┐
│  HOTFIX TRIGGERED                                   │
│  Skip: Orchestrator, Planners                       │
│  Go directly to: Executor                           │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│  EXECUTOR (Direct)                                  │
│  1. Read issue/problem description                  │
│  2. Identify root cause (minimal investigation)     │
│  3. Implement minimal fix                           │
│  4. Create regression test                          │
│  5. Run security-checker (abbreviated)              │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│  TESTER (Fast Track)                                │
│  1. Run affected test suite only                    │
│  2. Run regression test for fix                     │
│  3. Smoke test critical paths                       │
└───────────────────────────┬─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│  COMMITTER (Immediate)                              │
│  Branch: hotfix/issue-<num>-<desc>                  │
│  Commit: fix!: <description>                        │
│  PR: Marked as HOTFIX, priority review              │
└─────────────────────────────────────────────────────┘
```

### Step 1: Acknowledge Hotfix

Create minimal spec:
```markdown
# HOTFIX: Issue #<num>

## Status: IN_PROGRESS

## Problem
<brief description of the production issue>

## Impact
- Users affected: <count/scope>
- Business impact: <description>
- Started: <timestamp>

## Root Cause (preliminary)
<initial assessment>

## Fix Approach
<minimal fix description>

## Rollback Plan
<if fix fails, how to rollback>

---
*Hotfix mode activated at <timestamp>*
```

Save to: `.opencode/work/tasks/hotfix-<num>.md`

### Step 2: Minimal Investigation

Time-box investigation to 15 minutes max:
```bash
# Check recent deployments
git log --oneline -10

# Check error logs
# (use appropriate monitoring tools)

# Check recent changes to affected area
git log --oneline --since="24 hours ago" -- src/affected/path/
```

### Step 3: Implement Fix

Rules for hotfix code:
- **Minimal change** - fix only the immediate problem
- **No refactoring** - save for follow-up
- **No feature additions** - focus on the fix
- **Defensive coding** - add guards, not optimizations

### Step 4: Create Regression Test

Always add a test that:
1. Reproduces the original bug
2. Verifies the fix works
3. Prevents regression

```typescript
describe('HOTFIX: Issue #123', () => {
  it('should not crash when user has null email', () => {
    // This was crashing in production
    const user = { id: 1, email: null };
    expect(() => processUser(user)).not.toThrow();
  });
});
```

### Step 5: Abbreviated Security Check

Run focused security scan:
```bash
# Scan only changed files
npm run lint:security -- --files $(git diff --name-only HEAD~1)
```

### Step 6: Fast Track Testing

Run only:
- Tests for affected modules
- The new regression test
- Critical path smoke tests

```bash
# Run affected tests
npm test -- --testPathPattern="affected-module"

# Run smoke tests
npm run test:smoke
```

### Step 7: Hotfix Commit

Branch naming:
```
hotfix/issue-<num>-<short-desc>
```

Commit format:
```
fix!: <description>

HOTFIX for production issue #<num>

Problem: <what was broken>
Fix: <what was changed>
Impact: <users affected>

Closes #<num>
```

### Step 8: Expedited PR

```bash
gh pr create \
  --title "HOTFIX: <description>" \
  --body "## 🚨 HOTFIX

**Production Issue:** #<num>
**Severity:** Critical
**Impact:** <description>

## Fix
<description of fix>

## Testing
- [x] Regression test added
- [x] Affected tests pass
- [x] Smoke tests pass

## Rollback
If issues occur:
1. <rollback step 1>
2. <rollback step 2>

**Requires immediate review and merge.**" \
  --label "hotfix,priority-critical" \
  --reviewer "@team/oncall"
```

### Post-Hotfix Actions

After hotfix is merged and deployed:

1. **Monitor** - Watch metrics for 30 minutes
2. **Communicate** - Update stakeholders
3. **Document** - Update incident log
4. **Follow-up** - Create follow-up issues for:
   - Proper fix (if hotfix was a band-aid)
   - Root cause analysis
   - Process improvements

### Follow-up Issue Template

```markdown
## Follow-up from Hotfix #<num>

### Original Issue
<link to original issue>

### Hotfix Applied
<link to hotfix PR>

### Technical Debt
- [ ] <proper fix needed>
- [ ] <tests to add>
- [ ] <monitoring to improve>

### Root Cause Analysis
To be completed within 48 hours.

### Prevention
What can we do to prevent similar issues?
```

### Output Format

```
## Hotfix Mode Activated

**Issue:** #<num>
**Severity:** Critical
**Status:** IN_PROGRESS

### Timeline
- Hotfix started: <timestamp>
- Target resolution: <timestamp + 1 hour>

### Progress
- [x] Problem identified
- [x] Fix implemented
- [x] Regression test added
- [ ] Testing complete
- [ ] PR created
- [ ] Deployed

### Escalation
If not resolved in 1 hour, escalate to: <team/person>
```

### Quality Gates (Abbreviated)

Even in hotfix mode, these MUST pass:
- [ ] Regression test exists and passes
- [ ] No new security vulnerabilities
- [ ] Affected tests pass
- [ ] Code compiles/builds

These can be deferred:
- Full test suite
- Coverage threshold
- Documentation updates
- Code review depth
