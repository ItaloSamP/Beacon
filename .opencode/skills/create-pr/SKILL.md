---
name: create-pr
description: Creates well-documented Pull Requests on GitHub with proper linking, test evidence, and coverage reports.
---
## Create PR Skill

Create comprehensive Pull Requests that facilitate efficient code review and maintain project quality.

### When to Use
- After push-changes skill completes
- When committer agent finalizes the workflow
- For any code that needs to merge to main

### Prerequisites
- GitHub CLI (`gh`) authenticated
- Branch pushed to remote
- All CI checks passing (or acceptable)

### Step 1: Gather Context

```bash
# Current branch info
BRANCH=$(git branch --show-current)

# Commits in this PR
git log main..HEAD --oneline

# Files changed
git diff --stat main..HEAD

# Check for linked issue
echo $BRANCH | grep -oE '[0-9]+' | head -1
```

### Step 2: Collect Evidence

#### Test Logs
```bash
# Find test log for this issue
ls .opencode/work/logs/test-run-*.md
```

#### Coverage Report
```bash
# Find coverage report
ls .opencode/work/logs/coverage-*.md
```

#### Security Scan
```bash
# Find security scan
ls .opencode/work/logs/security-*.md
```

### Step 3: Generate PR Description

Use `pr-description` skill format with additions:

```markdown
## Summary
<!-- 1-2 sentence description of what this PR does -->

## Changes Made
- <!-- Bullet points of significant changes -->
- <!-- Include new dependencies if any -->
- <!-- Mention breaking changes if any -->

## Type
<!-- Feature | Bug Fix | Refactor | Docs | Tests | Maintenance -->

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

### Test Results
<!-- Link to test log -->
- **Test Log:** [test-run-<num>.md](./.opencode/work/logs/test-run-<num>.md)
- **Coverage:** XX% (threshold: 80%)
- **All tests passing:** Yes/No

## Security
- [ ] Security scan passed
- [ ] No sensitive data exposed
- [ ] Auth/permissions verified

<!-- Link to security scan -->
- **Security Scan:** [security-<num>.md](./.opencode/work/logs/security-<num>.md)

## Screenshots
<!-- If UI changes, include before/after -->

## Related
<!-- Link to issue -->
Closes #<issue-number>

## Checklist
- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] No console.log/debug statements
```

### Step 4: Create PR via GitHub CLI

```bash
# Create PR with full description
gh pr create \
  --title "feat(auth): add JWT token refresh endpoint" \
  --body "$(cat <<'EOF'
## Summary
Implement automatic token refresh to improve user session handling.

## Changes Made
- Add /api/auth/refresh endpoint
- Implement token rotation for security
- Add refresh token to HTTP-only cookie
- Add comprehensive test coverage

## Type
Feature

## Testing
- [x] Unit tests added
- [x] Integration tests added
- [ ] E2E tests (not applicable)

### Test Results
- **Test Log:** See .opencode/work/logs/test-run-42.md
- **Coverage:** 87% (threshold: 80%) ✓
- **All tests passing:** Yes ✓

## Security
- [x] Security scan passed
- [x] No sensitive data exposed
- [x] Auth/permissions verified

## Related
Closes #42

## Checklist
- [x] Code follows project conventions
- [x] Self-review completed
- [x] Documentation updated
- [x] No debug statements
EOF
)" \
  --base main \
  --head "$(git branch --show-current)"
```

### Step 5: Add Labels and Assignees

```bash
# Add labels based on PR type
gh pr edit --add-label "feature,needs-review"

# Add reviewers if configured
gh pr edit --add-reviewer "@team/backend"

# Link to project board if applicable
gh pr edit --add-project "Sprint 12"
```

### Step 6: Verify PR

```bash
# Get PR URL and number
gh pr view --json number,url

# Check PR status
gh pr checks
```

### PR Title Conventions

Follow same format as commit messages:
```
<type>(<scope>): <short description>
```

| Type | Example |
|------|---------|
| `feat` | `feat(auth): add password reset flow` |
| `fix` | `fix(api): handle null user gracefully` |
| `refactor` | `refactor(db): optimize query performance` |
| `docs` | `docs(readme): update installation guide` |

### PR Labels

Apply appropriate labels:
- `feature`, `bug`, `enhancement`, `documentation`
- `needs-review`, `work-in-progress`, `ready-to-merge`
- `breaking-change`, `security`, `performance`
- Priority: `priority-high`, `priority-medium`, `priority-low`

### Output Format

```
## Pull Request Created

**PR Number:** #45
**Title:** feat(auth): add JWT token refresh endpoint
**URL:** https://github.com/owner/repo/pull/45

**Branch:** feat/issue-42-add-auth-refresh → main

**Linked Issue:** #42

**Labels:** feature, needs-review

**Attachments:**
- Test Log: .opencode/work/logs/test-run-42.md
- Coverage: 87%
- Security: Passed

**CI Status:** Running...

**Next Steps:**
1. Wait for CI to complete
2. Request review from team
3. Address any feedback
4. Merge when approved
```

### Draft PRs

For work-in-progress:
```bash
gh pr create --draft \
  --title "WIP: feat(auth): add token refresh" \
  --body "Work in progress - do not review yet"
```

Convert to ready when complete:
```bash
gh pr ready
```

### Error Handling

#### PR Already Exists
```
Error: A pull request already exists

Action: Update existing PR instead
- gh pr edit <number> --body "updated description"
```

#### Base Branch Conflicts
```
Error: Merge conflict with base branch

Action: Rebase on latest main
- git fetch origin main
- git rebase origin/main
- Resolve conflicts
- git push --force-with-lease
```

### Integration
- Follows: `push-changes` skill
- Uses: `pr-description` skill for formatting
- Uses: `gh` CLI (GitHub CLI — must be authenticated via `gh auth login`)
- References: Test logs, coverage reports, security scans
