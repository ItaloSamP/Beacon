---
name: issue-reader
description: Reads and parses GitHub issues, extracting requirements, acceptance criteria, and metadata for the orchestrator.
---
## Issue Reader Skill

Parse GitHub issues into structured intake documents for the development workflow.

### When to Use
- At the start of any new issue/task from GitHub
- When the orchestrator needs to understand a new demand
- To create standardized intake documents

### Step 1: Fetch Issue
Run the gh command directly:
```bash
gh issue view <issue-number> --json title,body,labels,assignees,milestone,comments
```

### Step 2: Parse Issue Structure
Extract and categorize:

**Metadata:**
- Issue number and title
- Labels (bug, feature, enhancement, etc.)
- Assignees and milestone
- Priority indicators

**Content:**
- Problem statement / User story
- Acceptance criteria (look for checkboxes, numbered lists)
- Technical requirements (if specified)
- Design references / mockups (links)
- Related issues or dependencies

### Step 3: Classify Issue Type
Based on labels and content:
- `feature` - New functionality
- `bug` - Fix existing behavior
- `refactor` - Code improvement without behavior change
- `docs` - Documentation only
- `test` - Test additions/improvements
- `chore` - Maintenance tasks

### Step 4: Determine Scope
Analyze if the issue requires:
- **Frontend only**: UI changes, components, styling
- **Backend only**: API, database, business logic
- **Full-stack**: Both frontend and backend changes
- **Infrastructure**: DevOps, CI/CD, deployment

### Step 5: Create Intake Document
Save to `.opencode/work/tasks/issue-<num>-intake.md` (the orchestrator will later expand this into the full unified task file):

```markdown
# Issue #<num> Intake

## Metadata
- **Title:** <title>
- **Type:** <feature|bug|refactor|docs|test|chore>
- **Scope:** <frontend|backend|full-stack|infrastructure>
- **Priority:** <high|medium|low>
- **Labels:** <label1>, <label2>

## Problem Statement
<extracted problem/user story>

## Acceptance Criteria
- [ ] <criterion 1>
- [ ] <criterion 2>
- [ ] <criterion 3>

## Technical Requirements
<any technical constraints mentioned>

## Design References
<links to mockups, designs, etc.>

## Dependencies
- Related to: #<related-issue>
- Blocked by: #<blocking-issue>

## Notes
<any additional context or comments>

---
*Parsed by issue-reader skill*
*Ready for: @orchestrator — who will expand this into .opencode/work/tasks/issue-<num>.md*
```

### Step 6: Handoff
- Pass the intake document path to the orchestrator
- Include the classification for routing decisions
- Flag any ambiguities that need user clarification

### Parsing Rules
- If acceptance criteria are missing, create them from the description
- If labels are missing, infer type from title/body keywords
- If priority is unclear, default to `medium`
- Always preserve the original issue body verbatim in a collapsible section

### Output
Return the path to the intake document and a brief summary:
```
Parsed issue #<num>: "<title>"
Type: <type> | Scope: <scope>
Intake saved to: .opencode/work/tasks/issue-<num>-intake.md
```
