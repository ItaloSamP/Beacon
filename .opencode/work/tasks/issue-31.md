# Task: issue-31 — Documentation Hub (MkDocs Material + auto-generation + GitHub Pages)

## Status: DONE

## Metadata
- **Type:** docs
- **Scope:** full-stack (Python auto-generation + static MkDocs site)
- **Priority:** medium
- **Source:** GitHub Issue #31

## Problem Statement
Create a documentation hub using MkDocs Material, hosted on GitHub Pages. Combines manually-written pages (Home, About, Contributing) with auto-generated pages (Architecture, Features, DevOps, Releases) extracted from PROJECT_CONTEXT.md, feature briefs, and sprint plans. NO manual copy-paste — when source docs change, the hub updates automatically via CI.

## Acceptance Criteria
- [ ] mkdocs.yml configured with Material theme, Inter font, Beacon color palette, dark mode default
- [ ] Manual pages: Home (hero + badges + screenshot + quick links), About (vision, problem, solution), Contributing (git workflow, PR process, DoR, DoD)
- [ ] Auto-generated pages template: Architecture, Development, Features, DevOps & QA, Releases
- [ ] `scripts/generate_docs.py` — extracts content from PROJECT_CONTEXT.md, .opencode/work/docs/*.md, sprint task files
- [ ] GitHub Actions workflow: build docs → deploy to gh-pages root `/`
- [ ] `docs/stylesheets/extra.css` — Inter font, Beacon colors, dark mode refinements
- [ ] `docs/assets/` — screenshots, badges
- [ ] Site search, dark mode toggle, code highlighting, responsive navigation (MkDocs Material built-in)
- [ ] gh-pages coordination: deploys to root `/`, never touches `/hub/` (#26 territory)

## Technical Approach
**Decision:** MkDocs Material with Python auto-generation script + GitHub Actions CI
**Origin:** user-driven (from issue spec)
**Rationale:** MkDocs Material provides search, dark mode, navigation, code highlighting out of the box. Auto-generation eliminates manual copy-paste. Python script reads structured markdown sources.

## Architecture Fit
- Standalone — does not touch existing Beacon codebase
- Python script reads PROJECT_CONTEXT.md and sprint docs from `.opencode/work/`
- Deploys to gh-pages branch under root `/`
- Coordinates with #26: Quality Hub deploys to `/hub/`, Doc Hub to root `/` — path isolation prevents overwrites

## Implementation Plan

### Tasks
- [x] Task 1: Create `mkdocs.yml` — Material theme config, Inter font, Beacon colors, nav structure, plugins
- [x] Task 2: Create `docs/index.md` — Home page (hero, badges, screenshot placeholder, quick links)
- [x] Task 3: Create `docs/about.md` — About page (vision, problem, solution, value proposition)
- [x] Task 4: Create `docs/contributing.md` — Contributing guide (git workflow, PR process, DoR, DoD)
- [x] Task 5: Create `docs/architecture.md` — Auto-generated template (populated by generate_docs.py from PROJECT_CONTEXT.md)
- [x] Task 6: Create `docs/development.md` — Auto-generated template (populated from PROJECT_CONTEXT.md)
- [x] Task 7: Create `docs/features.md` — Auto-generated template (populated from .opencode/work/docs/*.md)
- [x] Task 8: Create `docs/devops.md` — Auto-generated template (populated from sprint task files)
- [x] Task 9: Create `docs/releases.md` — Auto-generated template (populated from sprint task files)
- [x] Task 10: Create `scripts/generate_docs.py` — Python script that reads source markdown files, extracts sections, writes docs/*.md (only overwrites auto-generated pages)
- [x] Task 11: Create `docs/stylesheets/extra.css` — Inter font import, Beacon color variables, dark mode tweaks
- [x] Task 12: Create `docs/assets/` — placeholder screenshots, badges
- [x] Task 13: Create `.github/workflows/docs-deploy.yml` — CI workflow: generate docs → mkdocs build → deploy to gh-pages root
- [x] Task 14: Install mkdocs-material locally, test with `mkdocs build`

### Implementation Order
1. `mkdocs.yml` first (configuration everything else depends on)
2. Manual pages (index.md, about.md, contributing.md) — stable content
3. Auto-generated page templates (architecture.md, development.md, features.md, devops.md, releases.md) — with placeholder content
4. `generate_docs.py` — the auto-generation engine
5. `extra.css` — styling
6. `assets/` — screenshots/badges
7. `docs-deploy.yml` — CI workflow
8. Local testing with `mkdocs serve`

### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| mkdocs.yml | CREATE | MkDocs Material configuration |
| docs/index.md | CREATE | Home page — manual content |
| docs/about.md | CREATE | About page — manual content |
| docs/contributing.md | CREATE | Contributing guide — manual content |
| docs/architecture.md | CREATE | Architecture — auto-generated template |
| docs/development.md | CREATE | Development — auto-generated template |
| docs/features.md | CREATE | Features — auto-generated template |
| docs/devops.md | CREATE | DevOps & QA — auto-generated template |
| docs/releases.md | CREATE | Releases — auto-generated template |
| scripts/generate_docs.py | CREATE | Auto-generation script |
| docs/stylesheets/extra.css | CREATE | Custom styles (Inter, Beacon colors, dark mode) |
| docs/assets/screenshot.png | CREATE | Placeholder screenshot for Home page |
| .github/workflows/docs-deploy.yml | CREATE | CI deploy workflow |

## Testing Strategy
- **Local test:** `pip install mkdocs-material`, `python scripts/generate_docs.py`, `mkdocs serve` — verify all pages render, navigation works, search works, dark mode works
- **Auto-generation test:** Modify PROJECT_CONTEXT.md section, re-run generate_docs.py, verify docs update accordingly without overwriting manual pages
- **CI test:** Push to dev, verify workflow runs and deploys to gh-pages

## Risks and Considerations
- **gh-pages coordination with #26:** must use path isolation — this hub deploys ONLY to root `/`, never touches `/hub/`
- **Content freshness:** auto-generated pages depend on `generate_docs.py` correctly parsing source markdown — defensive parsing with graceful failure if sections missing
- **MkDocs Material version:** pin version in CI workflow to avoid breaking changes
- **No .opencode/work/docs/ yet:** features.md will be sparse until sprint docs are created — generate_docs.py handles missing files gracefully

## Dependencies
- **External:** MkDocs Material (pip), Python 3.x
- **Internal:** Reads PROJECT_CONTEXT.md, .opencode/work/docs/*.md, .opencode/work/tasks/task-sprint-*.md

## Evidence (filled by tester/reviewer)
- **Test Log:** Tested locally — `mkdocs build` succeeds in 0.93s, all 8 pages generated
- **Coverage:** N/A (documentation site)
- **Security Scan:** Bandit 0 issues on generate_docs.py (327 lines); no hardcoded secrets
- **Review Verdict:** APPROVED (inline — orchestrator review)
- **Review Notes:** Minor: repo_url in mkdocs.yml uses beacon/beacon — update to ItaloSamP/Beacon when public. Badges in index.md same. Add `site/` to .gitignore (mkdocs build output).

---
*Created by @orchestrator-nontdd*
*Last updated: 2026-06-27*
