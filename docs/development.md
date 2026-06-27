# Development Guide

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite 6 |
| CSS | TailwindCSS v4 (CSS-based config via `@theme`) |
| State Management | React Query (TanStack Query v5) |
| Routing | React Router DOM v7 |
| Icons | Lucide React |
| UI Primitives | Radix UI (alert-dialog, dialog, select) |
| Backend | Python 3.13 + FastAPI |
| API Style | REST (envelope pattern: `{data, error}`) |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 (async, `async_sessionmaker`) |
| Migrations | Alembic |
| Cache | Redis 7 |
| Auth | JWT (dashboard) + API Keys (connectors) + Agent Tokens (local agents) |
| Encryption | Fernet (symmetric, connection_config at rest) |
| Email | SendGrid (template HTML) |
| Package Manager | pip/uv (Python) + npm (frontend) |
| Linter/Formatter | Ruff (Python) + ESLint (TypeScript) |
| Type Checker | mypy (Python) + TypeScript strict mode |
| Testing | pytest + pytest-asyncio + httpx (backend), Vitest + React Testing Library + MSW (frontend), Playwright (E2E) |
| CI/CD | GitHub Actions (backend, frontend, agent, docker-build, e2e) + Codecov |
| Containerization | Docker Compose (5 services: postgres, redis, backend, frontend, agent) |

### Dev Commands

**Backend:**

| Command | Description |
|---------|------------|
| `uvicorn app.main:app --reload` | Start dev server (backend) |
| `pytest` | Run unit + integration tests |
| `pytest --cov=app --cov-report=term` | Run tests with coverage |
| `ruff check .` | Lint Python code |
| `mypy app/` | Type-check Python (or N/A if not using mypy) |
| `bandit -r app/` | Security scan |
| `alembic upgrade head` | Run database migrations |
| `alembic downgrade -1` | Rollback last migration |

**Frontend:**

| Command | Description |
|---------|------------|
| `npm run dev` | Start dev server (frontend) |
| `npx vitest` | Run unit tests |
| `npx vitest --coverage` | Run tests with coverage |
| `npm run lint` | Lint TypeScript code |
| `npx tsc --noEmit` | Type-check TypeScript |
| `npm run build` | Build for production |
| `npx playwright test` | Run E2E tests (requires backend running) |
| `npx playwright test --ui` | Run E2E tests with Playwright UI |

**Test DB Management:**

| Command | Description |
|---------|------------|
| `docker compose up -d db_test` | Start test database |
| `alembic upgrade head` | Run database migrations (test) |
| `docker compose down -v db_test` | Reset test database |

### DB Access (Docker)

- **DB Container:** `beacon-postgres`
- **DB User:** `beacon_user`
- **DB Name:** `beacon_db`
- **Access Command:** `docker exec -i beacon-postgres psql -U beacon_user -d beacon_db -c "<query>"`

---

### Language-Specific

**Python:**
- Linting: Ruff (replaces flake8, isort)
- Formatting: Black, line length 88
- Type Hints: mandatory on all public functions and methods
- Naming: `snake_case` functions/variables, `PascalCase` classes
- Imports order: stdlib → third-party → local (enforced by Ruff)

**TypeScript:**
- Linting: ESLint + strict config
- Formatting: Prettier, 2 spaces, single quotes
- Type Checking: TypeScript strict mode
- Naming: `camelCase` variables/functions, `PascalCase` classes/components
- Imports: alphabetical, grouped by type (React → third-party → local)

### Universal Rules

**Error Handling:**
- Never silently swallow errors
- Return appropriate HTTP status codes (400, 401, 403, 404, 500)
- Log errors with context (user, operation, timestamp)
- Python: use specific exception types, avoid bare `except`

**Code Organization:**
- KISS — avoid over-engineering
- DRY — extract patterns, don't create premature abstractions
- No magic numbers — use named constants
- Clear, self-documenting names

**Comments:**
- Explain WHY, not WHAT
- No commented-out code in commits

**Security:**
- Input validation on all user inputs
- Parameterized queries (no SQL injection)
- Output encoding (XSS prevention)
- Never commit secrets — use environment variables
- CORS configured explicitly
- API keys stored hashed in database

**Performance:**
- Avoid N+1 queries — use SQLAlchemy `joinedload` / `selectinload`
- Index frequently queried columns
- Cache pipeline configuration and results with Redis
- Background tasks (Celery/ARQ) for pipeline execution

### Commit Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

**Branch Naming:** `<type>/<id>-<short-desc>`



