---
name: test-runner
description: Executes tests using project testing tools, captures results, and reports pass/fail status with details.
---
## Test Runner Skill

Execute all tests using the project's testing framework and capture results for reporting.

### When to Use
- After executor completes implementation
- After test-generator creates new tests
- Before code review
- As part of CI verification

### Prerequisites
**CRITICAL**: Read `PROJECT_CONTEXT.md` to understand:
- Testing frameworks and commands
- Required environment variables
- Test database setup (if applicable)
- Coverage thresholds

### Step 1: Environment Check
Read `PROJECT_CONTEXT.md` → `## 2. Technology Stack — Dev Commands` and verify:
- Backend test tool is available (check `Test Command`)
- Frontend test tool is available (check Frontend `Test Command`, if applicable)
- E2E tool is available (check `E2E Command`, if applicable)

### Step 2: Run Unit Tests
Use the **Test Command** from `PROJECT_CONTEXT.md` (backend):
```bash
# Example: go test -v -race -cover ./...
# Example: pytest -v
# Example: npx vitest run
<use command from PROJECT_CONTEXT.md>
```

### Step 3: Run Integration Tests
Use the backend **Test Command** with integration tag/directory if defined in PROJECT_CONTEXT.md.
If no separate integration command, include integration tests in Step 2.

### Step 4: Run E2E Tests
Use the **E2E Command** from `PROJECT_CONTEXT.md` (if applicable):
```bash
# Example: npx playwright test --reporter=list
# Example: cypress run
<use E2E command from PROJECT_CONTEXT.md, or skip if N/A>
```

### Step 5: Capture Results

#### Parse Test Output
Extract from test output:
- Total tests run
- Tests passed
- Tests failed
- Tests skipped
- Execution time
- Coverage percentage

#### Result Structure
```json
{
  "summary": {
    "total": 45,
    "passed": 43,
    "failed": 2,
    "skipped": 0,
    "duration": "12.5s"
  },
  "coverage": {
    "statements": 85.2,
    "branches": 78.4,
    "functions": 90.1,
    "lines": 84.8
  },
  "failures": [
    {
      "test": "UserService.login should reject invalid credentials",
      "file": "src/__tests__/userService.test.ts:45",
      "error": "Expected throw but got undefined",
      "stack": "..."
    }
  ]
}
```

### Step 6: Report Results

#### All Tests Pass
```markdown
## Test Results: PASS ✓

**Summary:**
- Total: 45 tests
- Passed: 45 (100%)
- Failed: 0
- Duration: 12.5s

**Coverage:**
- Statements: 85.2%
- Branches: 78.4%
- Functions: 90.1%
- Lines: 84.8%

**Status:** All tests pass (100%). Coverage >= 80%. Ready for code review.
```

#### Tests Failed
```markdown
## Test Results: FAIL ✗

**Summary:**
- Total: 45 tests
- Passed: 43
- Failed: 2
- Duration: 12.5s

**Failed Tests:**

### 1. UserService.login should reject invalid credentials
**File:** `src/__tests__/userService.test.ts:45`
**Error:** Expected throw but got undefined
**Probable Cause:** Missing validation in login function

### 2. API.createUser should return 201 on success
**File:** `src/__tests__/api.test.ts:112`
**Error:** Expected 201 but received 500
**Probable Cause:** Database connection issue or missing migration

**Action Required:** Return to @executor for fixes
```

### Step 7: Handoff Decision

**CRITICAL — 100% Pass Requirement:**
- **ALL tests must pass.** Zero failures tolerated. Any failed test = gate blocked → return to `@executor`.
- Coverage threshold: 80% for new code (or as specified in PROJECT_CONTEXT.md).

**If ALL tests pass AND coverage >= threshold:**
→ Handoff to `@reviewer`

**If ANY tests fail:**
→ Return to `@executor` with failure report

**If coverage below threshold:**
→ Return to `@executor` with coverage report

### Pass Threshold
**100% of tests must pass.** This is the highest priority gate check.
Coverage threshold: Default 80% (or as specified in PROJECT_CONTEXT.md).

### Test Isolation
Before running tests, use **Test DB Reset** from `PROJECT_CONTEXT.md` if applicable.
Prefer test transactions with rollback when the framework supports it.

### Output Format
```
## Test Execution Report

**Issue:** #<num>
**Timestamp:** <ISO timestamp>
**Duration:** <total time>

### Results
| Type | Passed | Failed | Skipped |
|------|--------|--------|---------|
| Unit | 40 | 0 | 2 |
| Integration | 5 | 0 | 0 |
| E2E | 3 | 0 | 0 |
| **Total** | **48** | **0** | **2** |

### Coverage
- New code: 87%
- Overall: 82%
- Threshold: 80% ✓

### Verdict: PASS
Ready for: @reviewer
```

### Integration with Other Skills
- Receives tests from: `test-generator`
- Reports to: `test-logger`
- On fail: Returns to `@executor`
- On pass: Handoffs to `@reviewer`
