---
name: push-changes
description: Safely pushes committed changes to remote repository with proper branch management.
---
## Push Changes Skill

Push local commits to the remote repository following safe practices and branch conventions.

### When to Use
- After commit-changes skill creates a commit
- When committer agent is preparing for PR
- Never push directly to main/master

### Prerequisites
**CRITICAL**: Read `PROJECT_CONTEXT.md` for:
- Branch naming conventions
- Protected branches
- Required CI checks

### Step 1: Verify Local State

```bash
# Check current branch
git branch --show-current

# Ensure we're not on main/master
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo "ERROR: Cannot push directly to $BRANCH"
  exit 1
fi

# Check commits to push
git log origin/$(git branch --show-current)..HEAD --oneline 2>/dev/null || echo "New branch"

# Verify clean state
git status
```

### Step 2: Create Feature Branch (if needed)

If on main/master, create a feature branch first:

```bash
# Branch naming convention
# feat/issue-<num>-<short-description>
# fix/issue-<num>-<short-description>
# refactor/issue-<num>-<short-description>

git checkout -b feat/issue-42-add-auth-refresh
```

#### Branch Naming Rules
| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/issue-<num>-<desc>` | `feat/issue-42-user-auth` |
| Bug Fix | `fix/issue-<num>-<desc>` | `fix/issue-123-login-error` |
| Refactor | `refactor/issue-<num>-<desc>` | `refactor/issue-45-cleanup` |
| Hotfix | `hotfix/issue-<num>-<desc>` | `hotfix/issue-99-critical-fix` |
| Docs | `.opencode/work/docs/issue-<num>-<desc>` | `.opencode/work/docs/issue-50-api-docs` |

### Step 3: Sync with Remote (if branch exists)

```bash
# Fetch latest remote state
git fetch origin

# If branch exists on remote, check for conflicts
git log HEAD..origin/$(git branch --show-current) --oneline 2>/dev/null

# Rebase if needed (no conflicts)
# git pull --rebase origin $(git branch --show-current)
```

### Step 4: Push to Remote

```bash
# First push (set upstream)
git push -u origin $(git branch --show-current)

# Subsequent pushes
git push
```

### Step 5: Verify Push

```bash
# Confirm push succeeded
git log origin/$(git branch --show-current) -1 --oneline

# Check remote tracking
git branch -vv
```

### Safety Rules

#### NEVER Do
- `git push --force` to shared branches
- `git push origin main`
- `git push origin master`
- Push without pulling first (on existing branches)
- Push sensitive files (check with `git diff --cached`)

#### ALWAYS Do
- Create feature branch first
- Pull/rebase before push on existing branches
- Verify branch name before push
- Check CI status after push

### Handling Conflicts

If push is rejected:

```bash
# Fetch and check remote changes
git fetch origin
git log HEAD..origin/$(git branch --show-current) --oneline

# Option 1: Rebase (preferred for clean history)
git pull --rebase origin $(git branch --show-current)
# Resolve any conflicts
git rebase --continue
git push

# Option 2: Merge
git pull origin $(git branch --show-current)
# Resolve any conflicts
git push
```

### Force Push (DANGER)

Only use when:
- Working on YOUR personal branch
- No one else has pulled your changes
- After interactive rebase on personal branch

```bash
# Use force-with-lease (safer)
git push --force-with-lease

# NEVER use --force on shared branches
```

### Output Format

```
## Push Successful

**Branch:** feat/issue-42-add-auth-refresh
**Remote:** origin
**Commits pushed:** 2
**Latest commit:** a1b2c3d - feat(auth): add JWT token refresh endpoint

**Remote URL:** https://github.com/owner/repo/tree/feat/issue-42-add-auth-refresh

**CI Status:** Pending (check GitHub Actions)

Ready for: create-pr skill
```

### Error Handling

#### Authentication Failed
```
Error: Authentication required

Action: Check GitHub credentials or SSH key
- Verify gh auth status
- Verify git remote -v
```

#### Push Rejected (Non-Fast-Forward)
```
Error: Updates were rejected (non-fast-forward)

Action: Pull remote changes first
- git fetch origin
- git pull --rebase origin <branch>
- Resolve conflicts if any
- Push again
```

#### Branch Protection
```
Error: Protected branch - push not allowed

Action: This branch requires a PR
- Create PR instead of direct push
- Ensure CI passes
- Get required approvals
```

### Integration
- Follows: `commit-changes` skill
- Precedes: `create-pr` skill
- Uses: `git` commands directly
