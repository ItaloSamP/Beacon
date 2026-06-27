# Contributing to Beacon

## Git Workflow

Beacon uses a **trunk-based development** workflow with feature branches:

1. **Branch from `main`** for all changes
2. **Branch naming:** `<type>/<id>-<short-desc>` (e.g., `feat/31-doc-hub`, `fix/42-null-check`)
3. **Commit convention:** Conventional Commits with scopes

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Examples:**

```
feat(agent): add PostgresConnector for schema profiling
fix(api): handle nullable agent_id in datasource update
docs(hub): add architecture documentation
test(e2e): add anomaly detail page spec
```

## Pull Request Process

### Before Opening a PR

- [ ] All tests pass locally (`pytest` for backend, `npx vitest` for frontend)
- [ ] Type checking passes (`mypy app/` for backend, `npx tsc --noEmit` for frontend)
- [ ] Linting passes (`python -m ruff check .` for backend, `npm run lint` for frontend)
- [ ] No commented-out code
- [ ] No hardcoded secrets — use environment variables
- [ ] Security scan passes (`bandit -r app/` for backend, `npm audit` for frontend)
- [ ] Database migrations included (if schema changed)

### PR Review

- All PRs require at least one approving review
- CI checks must pass (backend, frontend, agent, E2E, Docker build)
- Codecov coverage must not drop below 80% (feature code)
- Reviewer checks: architecture fit, security, test coverage, code style

## Definition of Ready (DoR)

A task is **Ready** when:

| Criterion | Description |
|-----------|-------------|
| Clear scope | The task has a well-defined problem, acceptance criteria, and implementation plan |
| Dependencies resolved | All blockers and prerequisites are completed or addressed |
| Testable | Acceptance criteria can be verified with automated tests or manual review |
| Estimated | Effort is estimated and fits within the sprint capacity |
| Aligned | Fits within the current architecture and product vision |

## Definition of Done (DoD)

A task is **Done** when:

| Criterion | Description |
|-----------|-------------|
| Code implemented | All tasks in the implementation plan are complete |
| Tests written | Unit, integration, and E2E tests cover the feature (80%+ coverage) |
| All tests pass | Backend (pytest), frontend (Vitest), and E2E (Playwright) pass |
| Linting clean | Ruff (backend) and ESLint (frontend) report zero errors |
| Type-checked | Mypy (backend) and TypeScript strict (frontend) pass |
| Security scanned | Bandit (backend) and npm audit (frontend) report zero critical/high issues |
| PR reviewed | At least one approving review with no unresolved HIGH concerns |
| Documentation updated | PROJECT_CONTEXT.md, CHANGELOG, and relevant docs are current |
| Evidence filed | Test logs, coverage reports, and security scans are attached |

## Coding Standards

See the [Development](development.md) guide for language-specific conventions (Python and TypeScript).

### Universal Rules

- **KISS** — avoid over-engineering; solve the problem at hand
- **DRY** — extract patterns but don't create premature abstractions
- **No magic numbers** — use named constants
- **Clear naming** — self-documenting function, variable, and class names

### Error Handling

- Never silently swallow errors
- Return appropriate HTTP status codes (400, 401, 403, 404, 422, 500)
- Log errors with context (user, operation, timestamp)
- Python: use specific exception types, avoid bare `except`

### Security

- Input validation on all user inputs
- Parameterized queries — no SQL injection
- Output encoding — XSS prevention
- Never commit secrets — use environment variables
- API keys and tokens stored as SHA-256 hashes
- CORS configured explicitly for the frontend origin

### Performance

- Avoid N+1 queries — use SQLAlchemy `joinedload` / `selectinload`
- Index frequently queried columns
- Cache pipeline configuration and results with Redis
- Background tasks for pipeline execution

## Repository Structure

```
beacon/
├── app/              # Backend (FastAPI cloud monolith)
│   ├── domain/       #   Business logic (models, schemas)
│   ├── application/  #   Use cases and services
│   ├── infrastructure/#  Database, repos, connectors, notifiers
│   ├── presentation/ #   Routes, controllers, middleware
│   └── shared/       #   Config, utilities, exceptions
├── agent/            # Local agent (Python package)
│   ├── profiling/    #   Schema, volume, null check profilers
│   ├── connectors/   #   PostgreSQL connector (asyncpg)
│   └── cli.py        #   beacon-agent CLI (Click)
├── frontend/         # Dashboard (React 19 + TypeScript)
│   ├── src/
│   │   ├── features/ #   Feature-based organization
│   │   └── components/#   Shared UI components
│   └── tests/e2e/    #   Playwright E2E tests
├── docs/             # Documentation hub (MkDocs Material)
├── scripts/          # Utility scripts
└── .github/workflows/# CI/CD pipelines
```
