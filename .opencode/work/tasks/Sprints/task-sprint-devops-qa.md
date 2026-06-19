# Task: task-sprint-devops-qa — DevOps & QA Pipeline

## Status: PLANNING

## Metadata
- **Type:** infrastructure
- **Scope:** ci/cd + deploy + monitoring
- **Priority:** high
- **Source:** Prompt — DevOps & QA discussion (user-confirmed, 2026-06-02)

---

## Problem Statement

O Beacon tem Dockerfiles, testes, linters e security scanners — mas **nenhum roda automaticamente**. Todo push e PR depende de execução manual. Não há bloqueio de merge, não há deploy automático, não há visibilidade centralizada de métricas de qualidade. Isso significa que um bug que quebra os testes ou um aviso de segurança do Bandit pode entrar em `main` sem ninguém perceber.

Esta sprint resolve isso criando a infraestrutura completa de CI/CD, qualidade e visibilidade.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GITHUB ACTIONS                                │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ BACKEND  │  │ FRONTEND │  │  AGENT   │  │     DOCKER       │    │
│  │   CI     │  │    CI    │  │   CI     │  │   BUILD+PUSH     │    │
│  │          │  │          │  │          │  │                  │    │
│  │ ruff →   │  │ eslint → │  │ ruff →   │  │ build backend   │    │
│  │ mypy →   │  │ tsc →    │  │ mypy →   │  │ build frontend   │    │
│  │ pytest → │  │ vitest → │  │ pytest   │  │ build agent      │    │
│  │ bandit → │  │ build    │  │          │  │ push to registry │    │
│  │ cov.xml  │  │ cov.json │  │          │  │                  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘    │
│       │             │             │                   │              │
│       ▼             ▼             ▼                   ▼              │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │                 RESULTS COLLECTOR (aggregate action)        │     │
│  │              Gera reports.json com todos os resultados      │     │
│  └───────────────────────┬────────────────────────────────────┘     │
│                          │                                          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌─────────┐  ┌──────────┐  ┌──────────────┐
        │ CODECOV │  │  GITHUB  │  │  HUB HTML    │
        │ (coverage│  │  PAGES   │  │ (localhost   │
        │  trends) │  │ (badges) │  │  dashboard)  │
        └─────────┘  └──────────┘  └──────────────┘
```

---

## Acceptance Criteria

### GitHub Actions — 4 Pipelines

1. **Backend CI** roda em push e PR para `app/**`, `tests/**`, `alembic/**`, `pyproject.toml`:
   - [ ] Ruff lint (zero errors)
   - [ ] Mypy type-check
   - [ ] Pytest unit tests (coverage gerado como `cov.xml`)
   - [ ] Bandit security scan (zero issues de HIGH severity)
   - [ ] Upload coverage para Codecov
   - [ ] Upload results para o Hub HTML

2. **Frontend CI** roda em push e PR para `frontend/**`:
   - [ ] ESLint (zero errors)
   - [ ] TypeScript type-check (`tsc --noEmit`)
   - [ ] Vitest unit tests (coverage gerado como JSON)
   - [ ] Build de produção (`npm run build`)
   - [ ] Upload coverage para Codecov
   - [ ] Upload results para o Hub HTML

3. **Agent CI** roda em push e PR para `agent/**`:
   - [ ] Ruff lint (zero errors)
   - [ ] Mypy type-check
   - [ ] Pytest (apenas testes do agente, sem dependência de PostgreSQL cloud)
   - [ ] Upload results para o Hub HTML

4. **Docker Build & Push** roda em push para `main`:
   - [ ] Build imagem backend (`docker/backend/Dockerfile`)
   - [ ] Build imagem frontend (`docker/frontend/Dockerfile`)
   - [ ] Build imagem agent (`docker/agent/Dockerfile`)
   - [ ] Push para GitHub Container Registry (`ghcr.io`)
   - [ ] Upload build status para o Hub HTML

### Quality Gates (PR Check)

- [ ] PR não faz merge se qualquer pipeline falhar
- [ ] Coverage não pode cair abaixo de 80% no diff
- [ ] Zero lint errors
- [ ] Zero Bandit HIGH issues
- [ ] Status check visível no PR como "required"

### Codecov

- [ ] Repositório conectado ao Codecov
- [ ] Coverage report aparece nos PRs como comentário
- [ ] Trend de coverage visível no dashboard do Codecov

### Hub HTML (GitHub Pages)

- [ ] Site estático hospedado em `https://ItaloSamP.github.io/Beacon`
- [ ] Dashboard interativo mostrando:
  - [ ] Status badges dos 4 pipelines (pass/fail/warning)
  - [ ] Coverage % com mini-gráfico de trend (últimos 10 runs)
  - [ ] Tabela de testes: total, passados, falhos, por componente
  - [ ] Tabela de lint warnings/errors por arquivo
  - [ ] Security scan: issues por severidade (HIGH/MEDIUM/LOW)
  - [ ] Docker build status + tamanho das imagens
  - [ ] Histórico navegável: filtro por data, componente, status
  - [ ] Filtros interativos e drill-down nos detalhes
- [ ] Design consistente com o Beacon (TailwindCSS, Inter, Lucide icons)
- [ ] Dados alimentados por `reports.json` gerado pela pipeline

### Deploy (PaaS — Render ou Railway)

- [ ] Backend deploy automático em push para `main`
- [ ] Frontend deploy automático em push para `main`
- [ ] Variáveis de ambiente configuradas no PaaS (não no código)
- [ ] Health check configurado

---

## Technical Approach

### Decisões confirmadas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| CI Platform | GitHub Actions | Grátis para repo público, integração nativa com PRs |
| Coverage | Codecov | Setup zero, diff coverage nos PRs, grátis |
| Hub Dashboard | HTML estático no GitHub Pages | Controle total, zero custo, design consistente com Beacon |
| Deploy | PaaS (Render recomendado) | Deploy automático via git push, sem gerenciar servidor |
| Container Registry | GitHub Container Registry (ghcr.io) | Integrado com GitHub Actions, sem conta separada |
| Agent Package | PyPI (`beacon-agent`) | `pip install` é o padrão do ecossistema Python |

### Pipeline Triggers

| Pipeline | Push (main) | Push (branch) | PR | Schedule |
|----------|-------------|----------------|-----|----------|
| Backend CI | ✅ | ✅ | ✅ | Diário 6h |
| Frontend CI | ✅ | ✅ | ✅ | Diário 6h |
| Agent CI | ✅ | ✅ | ✅ | Diário 6h |
| Docker Build | ✅ | ❌ | ❌ | — |

### Quality Gate Rules

| Gate | Severity | Action |
|------|----------|--------|
| Lint error | BLOCK | PR não faz merge |
| Type-check error | BLOCK | PR não faz merge |
| Test failure | BLOCK | PR não faz merge |
| Coverage drop > 2% | WARN | Comentário no PR, não bloqueia |
| Coverage < 80% overall | BLOCK | PR não faz merge |
| Bandit HIGH issue | BLOCK | PR não faz merge |
| Bandit MEDIUM issue | WARN | Comentário no PR, não bloqueia |
| Build failure | BLOCK | PR não faz merge |

---

## Hub HTML — Design & Funcionalidades

### Estrutura da página

```
┌─────────────────────────────────────────────────────────┐
│  🏠 Beacon Quality Hub                    última att: há 2 min │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ BACKEND  │ │ FRONTEND │ │  AGENT   │ │  DOCKER  │  │
│  │  ✅ PASS │ │  ✅ PASS │ │  ✅ PASS │ │  ✅ PASS │  │
│  │ 15 tests │ │ 183 tests│ │ 316 tests│ │ 3 images │  │
│  │ 92% cov  │ │ 74% cov  │ │ 94% cov  │ │ 245 MB   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                         │
│  📊 Coverage Trends (mini sparklines)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Backend  ▁▂▃▄▅▆▇█▇▆  92%   ▲ +2%              │   │
│  │ Frontend ▁▂▂▃▃▄▄▅▅▆  74%   ▲ +1%              │   │
│  │ Agent    ██████████  94%   — estável            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🔒 Security (Bandit)                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ HIGH: 0    MEDIUM: 3    LOW: 6    │  Ver detalhes │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🧪 Latest Test Runs                     [Filtrar ▼]    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Data       │ Component │ Tests │ Passed │ Fail  │   │
│  │ 02/06 14:22│ backend   │ 25    │ 25     │ 0     │   │
│  │ 02/06 14:18│ frontend  │ 183   │ 181    │ 2     │   │
│  │ 02/06 14:15│ agent     │ 316   │ 313    │ 3     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ⚠️ Lint Issues                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ File                  │ Line │ Rule    │ Severity│   │
│  │ pipeline_runner.py    │ 85   │ F841    │ WARN    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  🐳 Docker Images                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Image           │ Tag     │ Size   │ Status      │   │
│  │ beacon-backend  │ latest  │ 187 MB │ ✅ built    │   │
│  │ beacon-frontend │ latest  │ 45 MB  │ ✅ built    │   │
│  │ beacon-agent    │ latest  │ 132 MB │ ✅ built    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Funcionalidades interativas

1. **Filtro por componente:** botões Backend / Frontend / Agent / Docker — filtra todas as seções
2. **Filtro por data:** date picker para ver runs históricos
3. **Drill-down nos testes:** clica num componente → expande lista de testes falhos com nome do teste e stack trace
4. **Drill-down no lint:** clica num aviso → expande com o código da linha e sugestão de correção
5. **Drill-down no security:** clica numa issue → expande com descrição CWE, arquivo e linha
6. **Auto-refresh:** polling a cada 60s (ou via WebSocket se o GitHub Pages suportar)
7. **Dark mode:** toggle light/dark (consistente com o design system do Beacon)
8. **Export:** botão para baixar `reports.json` ou screenshot do dashboard

### Dados — `reports.json`

O arquivo é gerado por uma GitHub Action que agrega os resultados de todas as pipelines. Estrutura:

```json
{
  "generated_at": "2026-06-02T14:22:00Z",
  "commit": "abc1234",
  "branch": "main",
  "components": {
    "backend": {
      "status": "pass",
      "tests": { "total": 25, "passed": 25, "failed": 0, "skipped": 0 },
      "coverage": { "pct": 92.3, "trend": "+2.1" },
      "lint": { "errors": 0, "warnings": 3, "files": [...] },
      "security": { "high": 0, "medium": 3, "low": 6, "issues": [...] },
      "duration_sec": 45
    },
    "frontend": {
      "status": "pass",
      "tests": { "total": 183, "passed": 181, "failed": 2, "skipped": 0 },
      "coverage": { "pct": 74.2, "trend": "+1.0" },
      "lint": { "errors": 0, "warnings": 0, "files": [] },
      "security": { "high": 0, "medium": 0, "low": 0, "issues": [] },
      "duration_sec": 32
    },
    "agent": {
      "status": "pass",
      "tests": { "total": 316, "passed": 313, "failed": 3, "skipped": 0 },
      "coverage": { "pct": 94.0, "trend": "stable" },
      "lint": { "errors": 0, "warnings": 0, "files": [] },
      "duration_sec": 18
    },
    "docker": {
      "status": "pass",
      "images": [
        { "name": "beacon-backend", "tag": "latest", "size_mb": 187 },
        { "name": "beacon-frontend", "tag": "latest", "size_mb": 45 },
        { "name": "beacon-agent", "tag": "latest", "size_mb": 132 }
      ]
    }
  },
  "history": [ ... ]
}
```

---

## Implementation Plan

### Phase 1: GitHub Actions — Backend CI

**File:** `.github/workflows/backend-ci.yml`

- [ ] Trigger: push/pull_request para `app/**`, `tests/**`, `alembic/**`, `pyproject.toml`, `requirements.txt`
- [ ] Job: setup Python 3.13 + PostgreSQL service container + pip install
- [ ] Step: Ruff lint (`python -m ruff check .`)
- [ ] Step: Mypy type-check (`mypy app/`)
- [ ] Step: Pytest com coverage (`pytest --cov=app --cov-report=xml --cov-report=term`)
- [ ] Step: Bandit security scan (`bandit -r app/ -ll`)
- [ ] Step: Upload `coverage.xml` to Codecov
- [ ] Step: Generate report artifact → upload to workflow summary

### Phase 2: GitHub Actions — Frontend CI

**File:** `.github/workflows/frontend-ci.yml`

- [ ] Trigger: push/pull_request para `frontend/**`
- [ ] Job: setup Node.js 20 + npm ci
- [ ] Step: ESLint (`npm run lint`)
- [ ] Step: TypeScript type-check (`npx tsc --noEmit`)
- [ ] Step: Vitest com coverage (`npx vitest run --coverage`)
- [ ] Step: Build de produção (`npm run build`)
- [ ] Step: Upload coverage to Codecov
- [ ] Step: Generate report artifact → upload to workflow summary

### Phase 3: GitHub Actions — Agent CI

**File:** `.github/workflows/agent-ci.yml`

- [ ] Trigger: push/pull_request para `agent/**`
- [ ] Job: setup Python 3.13 + pip install agent/
- [ ] Step: Ruff lint (`python -m ruff check agent/`)
- [ ] Step: Mypy type-check (`mypy agent/`)
- [ ] Step: Pytest (`pytest agent/tests/`)
- [ ] Step: Generate report artifact

### Phase 4: GitHub Actions — Docker Build & Push

**File:** `.github/workflows/docker-build.yml`

- [ ] Trigger: push para `main`
- [ ] Job: Docker Buildx setup
- [ ] Step: Login to GitHub Container Registry (`ghcr.io`)
- [ ] Step: Build backend image (`docker/backend/Dockerfile`) → push `ghcr.io/italosamp/beacon-backend:latest`
- [ ] Step: Build frontend image (`docker/frontend/Dockerfile`) → push `ghcr.io/italosamp/beacon-frontend:latest`
- [ ] Step: Build agent image (`docker/agent/Dockerfile`) → push `ghcr.io/italosamp/beacon-agent:latest`
- [ ] Step: Generate build report (image sizes, tags)

### Phase 5: Results Aggregator (GitHub Action)

**File:** `.github/workflows/reports-aggregator.yml`

- [ ] Trigger: `workflow_run` — roda após backend-ci, frontend-ci, agent-ci, docker-build
- [ ] Coleta artifacts de cada pipeline
- [ ] Gera `reports.json` consolidado
- [ ] Commit `reports.json` para `gh-pages` branch
- [ ] Atualiza badges no README

### Phase 6: Hub HTML (GitHub Pages)

**File:** `.github/workflows/hub-deploy.yml`

- [ ] Trigger: push para `gh-pages` branch (quando `reports.json` é atualizado)
- [ ] Job: deploy to GitHub Pages
- [ ] HTML/CSS/JS estático que lê `reports.json` e renderiza o dashboard

**Files to create:**
- [ ] `hub/index.html` — estrutura da página, layout grid
- [ ] `hub/app.js` — lógica de renderização, filtros, drill-down, auto-refresh
- [ ] `hub/style.css` — design com TailwindCSS CDN (zero build step)
- [ ] `hub/reports.json` — dados mock iniciais para desenvolvimento

**Design decisions:**
- TailwindCSS via CDN (sem build step — GitHub Pages é estático puro)
- Lucide icons via CDN
- Inter font via Google Fonts CDN
- JS vanilla (sem React — a página é simples o bastante)
- Todos os dados vêm de `reports.json` (fetch no load)
- Dark mode detectado via `prefers-color-scheme` + toggle manual

### Phase 7: Codecov Setup

- [ ] Conectar repositório `ItaloSamP/Beacon` no site codecov.io
- [ ] Adicionar `CODECOV_TOKEN` como secret no GitHub
- [ ] Configurar `codecov.yml` na raiz do projeto:
  - Threshold: coverage não pode cair mais de 2% no diff
  - Comentário no PR: sim, com resumo
  - Status check: required (bloqueia merge se cair abaixo de 80%)

### Phase 8: Deploy (Render)

- [ ] Criar conta no Render (render.com)
- [ ] Conectar repositório GitHub
- [ ] **Backend (Web Service):**
  - Build command: `pip install -e ".[dev]" && alembic upgrade head`
  - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Env vars: `DATABASE_URL`, `JWT_SECRET`, `SENDGRID_API_KEY`, etc.
- [ ] **Frontend (Static Site):**
  - Build command: `cd frontend && npm install && npm run build`
  - Publish directory: `frontend/dist`
  - Env var: `VITE_API_URL` apontando para o backend Render
- [ ] Configurar health checks
- [ ] Configurar domínio customizado (opcional)

### Phase 9: Quality Gates (Branch Protection)

- [ ] No GitHub repo Settings → Branches → Add rule para `main`:
  - [ ] Require status checks: `backend-ci`, `frontend-ci`, `agent-ci`
  - [ ] Require PR review (1 approval)
  - [ ] Require conversation resolution
  - [ ] Require branches to be up to date

---

## Files to Create

| File | Purpose |
|------|---------|
| `.github/workflows/backend-ci.yml` | Backend CI pipeline |
| `.github/workflows/frontend-ci.yml` | Frontend CI pipeline |
| `.github/workflows/agent-ci.yml` | Agent CI pipeline |
| `.github/workflows/docker-build.yml` | Docker build & push |
| `.github/workflows/reports-aggregator.yml` | Results collector |
| `.github/workflows/hub-deploy.yml` | Deploy Hub to GitHub Pages |
| `codecov.yml` | Codecov configuration |
| `hub/index.html` | Hub HTML dashboard |
| `hub/app.js` | Hub JavaScript logic |
| `hub/style.css` | Hub styles |
| `hub/reports.json` | Initial mock data |
| `.dockerignore` | Docker ignore rules (if not exists) |

### Files to Modify

| File | Purpose |
|------|---------|
| `pyproject.toml` | Add `bandit`, `pytest-cov` to dev deps |
| `README.md` | Add status badges + link to Hub |
| `docker-compose.yml` | Verify production readiness |

---

## Testing Strategy

- **CI pipelines:** testar com um PR real — criar branch, fazer push, verificar se todas as pipelines disparam
- **Hub HTML:** abrir localmente com `npx serve hub/` e verificar renderização com dados mock
- **Docker build:** verificar se as imagens sobem para ghcr.io
- **Codecov:** verificar comentário no PR após primeiro push com coverage

---

## Risks and Considerations

| Risco | Mitigação |
|-------|-----------|
| **PostgreSQL no CI** — backend tests precisam de PostgreSQL. Usar `service container` no GitHub Actions | Configurar `postgres:16` como service no workflow YAML |
| **asyncpg no Ubuntu** — CI roda Ubuntu (Linux), então o bug do Windows não afeta. Mas precisa testar. | Confirmar que `pytest` passa no Ubuntu antes de habilitar o gate |
| **GitHub Pages branch** — `gh-pages` precisa existir e ter o HTML publicado | Criar branch via ação automática na primeira execução |
| **Render free tier** — pode ter cold start de 50s após inatividade | Aceitável para MVP. Migrar para plano pago se necessário |
| **Secrets** — `SENDGRID_API_KEY`, `JWT_SECRET`, `FERNET_KEY` não podem estar no código | Usar GitHub Secrets + Render env vars |
| **Hub HTML sem build step** — TailwindCSS CDN é pesado (~300KB) mas aceitável para um dashboard interno | Se performance for problema, migrar para build com Vite depois |

---

## Evidence

- **CI runs:** _— filled after first push_
- **Hub URL:** _— filled after deploy_
- **Codecov:** _— filled after setup_

---

*Created by @plan-maker*
*Last updated: 2026-06-02T00:00:00Z*
