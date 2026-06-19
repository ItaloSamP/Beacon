# Project Context — [PROJECT_NAME]

> **Last Updated:** [TODAY] | **Maintained By:** [User or "AI Agent Team"]
> **Architecture:** [PATTERN]

---

## 1. Project Overview

[2-3 sentences: what it does, who it's for, core value proposition]

---

## 2. Technology Stack — Dev Commands

| Layer | Technology |
|-------|-----------|
| Frontend | [framework] |
| Build Tool | [vite/webpack/next] |
| CSS | [tailwind/css-modules/styled] |
| Backend | [language + framework] |
| Database | [postgresql/mysql/mongodb] |
| ORM | [prisma/gorm/sqlalchemy] |
| Auth | [jwt/oauth2/session/none] |
| Package Manager | [npm/yarn/pnpm/pip/go] |
| Linter | [eslint/ruff/golangci-lint] |
| Formatter | [prettier/black/gofmt] |

**Dev Commands:**

| Command | Description |
|---------|------------|
| `[dev-server-cmd]` | Start dev server |
| `[test-cmd]` | Run unit + integration tests |
| `[e2e-cmd]` | Run E2E tests (or N/A) |
| `[lint-cmd]` | Lint code |
| `[typecheck-cmd]` | Type-check (or N/A) |
| `[build-cmd]` | Build for production |
| `[security-cmd]` | Security scan (or N/A) |

**Test DB Management:**

| Command | Description |
|---------|------------|
| `[db-reset-cmd]` | Reset test database (or N/A) |
| `[migrate-cmd]` | Run database migrations (or N/A) |

---

## 3. Architecture

**Pattern:** [Clean Architecture / Hexagonal / Layered (MVC) / Microservices / Modular Monolith]

[Brief description of layer responsibilities and key decisions]

---

## 4. Data Model

**Core Entities:**

| Entity | Key Fields | Relationships |
|--------|-----------|---------------|
| [Entity 1] | [field1, field2] | [belongs to X, has many Y] |
| [Entity 2] | ... | ... |

> For full schema → see `DATA_MODEL.md` (if exists)

---

## 5. Coding Standards & Conventions

- **Naming:** [camelCase / PascalCase / snake_case]
- **Files/Folders:** [kebab-case / PascalCase]
- **Imports:** [ordering rule or N/A]
- **Commit Convention:** [Conventional Commits]
- **Branch Naming:** `<type>/<id>-<short-desc>`

---

## 6. Testing Strategy

- **Framework:** [Jest / Vitest / PyTest / Go Test]
- **E2E:** [Playwright / Cypress / N/A]
- **Coverage Threshold:** [80%]
- **Test File Convention:** `*.test.ts` / `test_*.py` / `*_test.go`
- **Test Location:** [next to source / `__tests__/` / `tests/`]
- **Mock Strategy:** [mock at service boundaries]
- **Pre-commit/PR:** tests must pass

---

## 7. Authentication & Security

- **Auth Method:** [JWT / OAuth2 / Session / API Keys / None]
- **Security Scanner:** [gosec / bandit / npm audit / N/A]
- **Secrets Management:** [.env / vault / cloud secrets]

---

## 8. Styling & Design

- **Figma File:** [URL or N/A]
- **Primary Font:** [Inter / System default]
- **CSS Approach:** [Tailwind / CSS Modules / Styled Components]
- **Color Palette:** [brief description or main tokens]

> For full design system → see `DESIGN.md` (if exists)

---

## 9. External Dependencies & Integrations

| Service | Purpose | Auth/Config |
|---------|---------|-------------|
| [Service] | [What it does] | [API key / OAuth] |

(Use `N/A` if none)

---

## 10. Common Pitfalls & Lessons Learned

> _Filled automatically by the `lessons-writer` skill during development._

---

## 11. Context Files

> Specialized context documents. Load the relevant file for each task type.

| File | Purpose | When to read |
|------|---------|--------------|
| `DESIGN.md` | Tokens, tipografia, paleta, componentes | Tarefas frontend/UI |
| `API.md` | Endpoints, contratos, error codes | Integração, testes |
| `DATA_MODEL.md` | Schema completo, relacionamentos | Tarefas DB/migrations |
| `DECISIONS.md` | ADRs, decisões arquiteturais | Planejamento, review |
| `WORKFLOWS.md` | CI/CD, branching, deploy | Commit, hotfix |

---
*Created by context-generator on [TODAY]*
