---
name: commit-changes
description: Creates standardized conventional commits following project conventions and best practices.
---
## Commit Changes Skill

Create well-structured, conventional commits that follow project standards and provide clear history.

### When to Use
- After code review approval (task status = READY_TO_COMMIT)
- When committer agent is invoked
- Never automatically - always requires explicit trigger

### Prerequisites
**CRITICAL**: Read `PROJECT_CONTEXT.md` for:
- Commit message conventions
- Branching strategy
- Required sign-offs or co-authors

### Step 1: Verify Ready State
```bash
# Check task status
grep -l "^## Status: READY_TO_COMMIT" .opencode/work/tasks/*.md

# Verify clean working directory (only expected changes)
git status

# Review what will be committed
git diff --staged
git diff
```

### Step 2: Stage Files
Stage only relevant files - NEVER stage sensitive files:

```bash
# Stage specific files (preferred)
git add src/features/newFeature.ts
git add src/__tests__/newFeature.test.ts

# Or stage by pattern
git add "src/**/*.ts"

# NEVER do this blindly
# git add -A  # Dangerous - may include secrets
# git add .   # Dangerous - may include secrets
```

**Files to NEVER commit:**
- `.env`, `.env.*`
- `*.pem`, `*.key`, `*.crt`
- `credentials.json`, `secrets.yaml`
- `node_modules/`, `__pycache__/`
- `.DS_Store`, `Thumbs.db`

### Step 3: Craft Commit Message

#### Conventional Commit Format
```
<type>(<scope>): <subject>
```

#### Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change, no feature/fix |
| `perf` | Performance improvement |
| `test` | Adding/updating tests |
| `chore` | Maintenance, dependencies |
| `ci` | CI/CD changes |

#### Scope
Optional, indicates affected area:
- `auth`, `api`, `ui`, `db`, `config`

#### Subject Rules
- Imperative mood ("add" not "added")
- No period at end
- Max 50 characters
- Lowercase

### Step 4: Create Commit

```bash
git commit -m "feat(auth): add JWT token refresh endpoint"
```

### Step 5: Verify Commit

```bash
# Check commit was created
git log -1 --oneline

# Verify commit content
git show HEAD --stat
```

### Pre-commit Checks
Before committing, verify:
- [ ] All tests pass
- [ ] Linting passes
- [ ] No console.log/print statements
- [ ] No commented-out code
- [ ] No TODO without issue reference
- [ ] No sensitive data in diff

### Output Format
```
## Commit Created

**Hash:** a1b2c3d
**Type:** feat
**Scope:** auth
**Message:** add JWT token refresh endpoint

**Files committed:**
- src/features/auth/refresh.ts (new)
- src/features/auth/tokenService.ts (modified)
- src/__tests__/auth/refresh.test.ts (new)

**Issue:** Closes #42

Ready for: push-changes skill
```

### Error Handling

**If pre-commit hook fails:**
1. Read hook output
2. Fix the issue
3. Stage fixes
4. Try commit again
5. DO NOT use `--no-verify`

**If commit is too large:**
1. Consider splitting into logical commits
2. Each commit should be atomic (one logical change)
