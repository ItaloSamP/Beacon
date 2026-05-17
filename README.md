# Beacon

**Data trust platform with hybrid architecture** — local agent for profiling + cloud dashboard for management.

Beacon attests the **quality of your data**: it learns the historical baseline of each table and alerts when distributions, volumes, or schemas deviate from normal — even if nobody configured a specific rule.

Setup in 5 minutes, zero validation queries required.

---

## Architecture

```
┌─────────────────────────────────────┐
│  User (beacon.app)                   │
│  ├── Agent 1 (client infra A)        │
│  │   ├── DataSource A1 (PostgreSQL)  │
│  │   └── DataSource A2 (MySQL)       │
│  └── Agent 2 (client infra B)        │
│      └── DataSource B1 (BigQuery)    │
└─────────────────────────────────────┘
```

- **Local Agent** (Python) — runs on client infrastructure, connects to databases, does statistical profiling, learns baselines, detects anomalies via z-score. **Never sends raw data** — only statistical summaries and schema metadata.
- **Cloud Dashboard** (FastAPI + React) — centralized management, anomaly history, alert dispatch (email), remote agent configuration.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + TailwindCSS v4 |
| State | TanStack Query (React Query) |
| Backend | Python 3.13 + FastAPI |
| Database | PostgreSQL 16 + SQLAlchemy 2.0 (async) |
| Cache | Redis 7 |
| Auth | JWT (dashboard) + API Keys (connectors) |
| Lint | Ruff (Python) + ESLint (TypeScript) |

---

## Docker Quick Start

The fastest way to run Beacon is with Docker Compose — everything starts with a single command:

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) (included in Docker Desktop)
- **Windows users:** For good I/O performance, clone the project inside your WSL2 filesystem (`/home/...`), not under `/mnt/c/...`

### Start Everything

```bash
# 1. Set up your environment
cp .env.example .env

# 2. Start all services (PostgreSQL, Redis, Backend, Frontend, Agent)
docker compose up
```

That's it! The first build takes 2-3 minutes. Subsequent starts are instant.

### Access Points

| Service  | URL                          | Description              |
|----------|------------------------------|--------------------------|
| Frontend | http://localhost:5173        | React Dashboard          |
| Backend  | http://localhost:8000        | FastAPI REST API         |
| API Docs | http://localhost:8000/docs   | Swagger UI               |
| Postgres | localhost:5432               | PostgreSQL 16            |
| Redis    | localhost:6379               | Redis 7                  |

### Test User

| Email              | Password  |
|--------------------|-----------|
| admin@beacon.dev   | admin123  |

### What Happens on Startup

1. **PostgreSQL** and **Redis** start with health checks
2. **Backend** waits for both, then:
   - Runs database migrations (`alembic upgrade head`)
   - Seeds sample data (admin user, agent, datasources, pipelines)
   - Generates an agent token for the local dev agent
   - Starts the FastAPI server with hot-reload on port 8000
3. **Frontend** starts the Vite dev server with hot-reload on port 5173, proxying `/api` to the backend
4. **Agent** waits for the token file, then connects to the backend and starts profiling

### Port Conflicts

If ports are already in use on your host, create a `docker-compose.override.yml`:

```yaml
services:
  postgres:
    ports: ["5433:5432"]
  backend:
    ports: ["8001:8000"]
  frontend:
    ports: ["5174:5173"]
```

Then update your local `.env` to match the new ports.

### Rebuilding After Dependency Changes

If `pyproject.toml` or `package.json` changes, rebuild the affected service:

```bash
docker compose build backend    # Python deps changed
docker compose build frontend   # Node deps changed
docker compose build agent      # Agent deps changed
```

### Running Tests Inside Docker

```bash
# Backend unit + migration tests (no PostgreSQL issues on Linux containers!)
docker compose exec backend python -m pytest tests/application/ tests/migrations/ -v

# Backend full test suite (integration tests require PostgreSQL — works on Linux containers)
docker compose exec backend python -m pytest tests/ -v

# Frontend tests
docker compose exec frontend npx vitest run
```

---

## Prerequisites (Manual Setup)

- Python 3.13+
- Node.js 20+
- PostgreSQL 16
- Redis 7 (optional for development)

---

## Quick Start (Manual Setup)

### 1. Clone and set up environment

```bash
cp .env.example .env
# Edit .env with your database credentials if needed
```

### 2. Start infrastructure (Docker)

```bash
docker compose up -d
# Starts PostgreSQL 16 and Redis 7
```

### 3. Backend setup

```bash
pip install -e ".[dev]"
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`.

API docs: `http://localhost:8000/docs`

### 4. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The dashboard is available at `http://localhost:5173`.

Test user: `admin@beacon.dev` / `admin123`

---

## Project Structure

```
beacon/
├── app/                          # Backend (Modular Monolith)
│   ├── domain/                   # Models, enums, schemas
│   ├── application/              # Services, use cases
│   ├── infrastructure/           # Database, repos, connectors, notifiers
│   ├── presentation/             # API routes, middleware
│   └── shared/                   # Config, exceptions
├── agent/                        # Local agent (Python package)
├── alembic/                      # Database migrations
├── frontend/                     # React + TypeScript dashboard
│   └── src/
│       ├── features/             # Feature-based organization
│       │   ├── agents/
│       │   ├── datasources/
│       │   ├── pipelines/
│       │   ├── anomalies/
│       │   └── alerts/
│       ├── components/           # Shared UI components
│       ├── hooks/                # Shared hooks
│       ├── lib/                  # API client
│       └── types/                # TypeScript types
├── tests/                        # Backend integration tests
├── docker-compose.yml            # Development services
└── README.md
```

---

## Development Commands

### Backend

| Command | Description |
|---------|------------|
| `uvicorn app.main:app --reload` | Start dev server |
| `pytest` | Run tests |
| `pytest --cov=app --cov-report=term` | Tests with coverage |
| `ruff check .` | Lint Python |
| `bandit -r app/` | Security scan |
| `alembic upgrade head` | Run migrations |
| `alembic revision --autogenerate -m "desc"` | Create migration |

### Frontend

| Command | Description |
|---------|------------|
| `npm run dev` | Start dev server |
| `npx vitest run` | Run tests |
| `npx vitest --coverage` | Tests with coverage |
| `npm run lint` | Lint TypeScript |
| `npx tsc --noEmit` | Type-check |
| `npm run build` | Production build |

---

## Testing

- **Backend:** Pytest with async HTTP client (httpx). Requires PostgreSQL.
- **Frontend:** Vitest + React Testing Library + MSW for API mocking.
- **E2E:** Playwright (planned for Sprint 1+).

---

## Contributing

1. Follow the coding standards in `PROJECT_CONTEXT.MD`
2. Write tests for all new code
3. Run `ruff check .` and `npm run lint` before committing
4. Use conventional commits: `feat(scope): description`

---

## License

Proprietary — all rights reserved.
