---
name: quick-review
description: Fast, structured code review with security integration. Use for reviewing changes before PR.
---
## Quick Code Review

Perform a fast, comprehensive code review on recently changed files with integrated security checking.

### When to Use
- Developer asks for a code review
- After completing a feature or bug fix
- Before creating a pull request
- During reviewer phase

---

## Review Steps

### Step 1: Get Changed Files
```bash
# For recent commit
git diff --name-only HEAD~1

# For feature branch
git diff --name-only main...HEAD
```

### Step 2: Read Full Context
Read each changed file to understand the full context, not just the diff:
```bash
# List files with stats
git diff --stat main...HEAD
```

### Step 3: Review the Diff
```bash
# Full diff with context
git diff main...HEAD

# Or for specific file
git diff main...HEAD -- path/to/file.ts
```

### Step 4: Security Check Integration
Run `security-checker` skill on changed files:
```
security-checker --files <changed-files>
```

Verify:
- [ ] No SQL injection patterns
- [ ] No XSS vulnerabilities
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Auth checks in place

---

## Structured Feedback Format

### Summary
One-sentence overall assessment of the changes.

### Critical Issues (Must Fix)
Issues that **block** approval:
- Security vulnerabilities
- Logic errors / bugs
- Data corruption risks
- Breaking changes without migration

Format:
```markdown
#### [CRITICAL] Issue Title
**File:** `path/to/file.ts:42`
**Problem:** <clear description>
**Fix:**
```code
<suggested fix>
```
```

### Issues Found (Should Fix)
Important but not blocking:
- Performance concerns
- Error handling gaps
- Code smell / maintainability

Format:
```markdown
#### [HIGH/MEDIUM] Issue Title
**File:** `path/to/file.ts:42`
**Problem:** <clear description>
**Suggestion:**
```code
<suggested improvement>
```
```

### Suggestions (Nice to Have)
Optional improvements:
- Code style preferences
- Readability enhancements
- Alternative approaches

Format:
```markdown
#### [LOW] Suggestion Title
**File:** `path/to/file.ts:42`
**Note:** <suggestion>
```

### Verdict
One of:
- **APPROVE** - Ready to merge
- **REQUEST_CHANGES** - Issues must be fixed
- **NEEDS_DISCUSSION** - Requires clarification

---

## Review Checklist

### Code Quality
- [ ] Code is readable and self-documenting
- [ ] Variable names are clear and descriptive
- [ ] Functions are focused (single responsibility)
- [ ] No unnecessary complexity
- [ ] No duplicate code
- [ ] No commented-out code
- [ ] No console.log/debug statements

### Logic & Correctness
- [ ] Edge cases handled
- [ ] Null/undefined checks where needed
- [ ] Proper error handling
- [ ] No obvious bugs
- [ ] Business logic is correct

### Performance
- [ ] No N+1 query patterns
- [ ] No unnecessary re-renders (React)
- [ ] Efficient algorithms
- [ ] No memory leaks
- [ ] Lazy loading where appropriate

### Security
- [ ] Input validation present
- [ ] SQL injection protected (parameterized queries)
- [ ] XSS protected (output encoding)
- [ ] No hardcoded secrets
- [ ] Proper authentication/authorization

### Testing
- [ ] Tests exist for new code
- [ ] Tests are meaningful (not just for coverage)
- [ ] Edge cases tested
- [ ] Error scenarios tested

### Architecture
- [ ] Follows project patterns (per PROJECT_CONTEXT.md)
- [ ] Proper layer separation
- [ ] No circular dependencies
- [ ] Appropriate abstraction level

---

## Review Rules

1. **Be specific and actionable** - No vague comments like "could be better"
2. **Reference exact locations** - Include file paths and line numbers
3. **Distinguish severity** - Critical vs suggestion
4. **Provide fixes** - Don't just point out problems
5. **Be objective** - Focus on code, not person
6. **If code is good, say so** - Don't invent issues

---

## Output Format

```markdown
## Quick Review: <branch-name>

### Summary
<one-sentence assessment>

### Files Reviewed
| File | Lines Changed | Status |
|------|---------------|--------|
| src/... | +45, -12 | ✓ |
| src/... | +23, -5 | ⚠ |

### Security Check
- Status: PASSED / FAILED
- Issues: <count>

### Issues Found

#### [CRITICAL] Missing Authentication Check
**File:** `src/routes/admin.ts:23`
**Problem:** Admin endpoint accessible without auth
**Fix:**
```typescript
router.get('/admin', authMiddleware, adminHandler);
```

#### [MEDIUM] Potential Memory Leak
**File:** `src/hooks/useData.ts:45`
**Problem:** Event listener not cleaned up
**Suggestion:**
```typescript
useEffect(() => {
  const handler = () => {...};
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

### Suggestions

#### [LOW] Consider extracting to utility
**File:** `src/utils/format.ts:12`
**Note:** Date formatting logic could be a shared utility

### Verdict: REQUEST_CHANGES

**Required before approval:**
1. Add authentication to admin endpoint

**Recommended:**
1. Fix event listener cleanup
```

---

## Integration
- Used by: `code-reviewer` agent
- Integrates with: `security-checker` skill
- Reports issues to: `lessons-writer` for patterns
