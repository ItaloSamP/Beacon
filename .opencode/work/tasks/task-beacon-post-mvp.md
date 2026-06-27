# Task: task-beacon-post-mvp — Roadmap Pós-MVP — 4 Fases

## Status: PLANNING (v3 — completo)

## Metadata
- **Type:** feature (multi-phase roadmap)
- **Scope:** full-stack (backend + frontend + design + infra)
- **Priority:** high
- **Source:** Prompt — Product strategy session
- **Tese de Posicionamento:** "O Guarda Noturno" — Beacon é silencioso, passivo, e só aparece quando algo está errado.
- **Cobertura:** 4 fases, 60+ tasks, 27 novos componentes, 12 telas com specs detalhadas, 12 protótipos HTML no Figma

---

## Problem Statement

O Beacon atual entrega ~85% do MVP funcional, mas três lacunas separam o código pronto de um produto que cumpre sua promessa central e está pronto para adoção real:

1. **Motor de detecção 3/10** — z-score em 2 métricas cobre só desastres óbvios. Não detecta deriva lenta, duplicatas, falta de frescor, nem modela sazonalidade.
2. **Onboarding não cumpre "5 minutos"** — fluxo atual exige criar conta, criar agente, copiar token, instalar via pip, criar datasource manualmente, criar pipeline manualmente, rodar manualmente. Isso leva 15-20 minutos.
3. **Produto não tem identidade nítida** — "detecta anomalias" é genérico. Falta uma narrativa de produto que diferencie de Monte Carlo, Soda, Great Expectations.

Este roadmap em 4 fases resolve as três lacunas, nessa ordem de prioridade.

---

## Acceptance Criteria (por fase)

### Fase 1 — Motor de Detecção
- [ ] 5 novos profilers no agente: CardinalityProfiler, DistributionProfiler (min/P50/P95/max), FreshnessProfiler, FormatProfiler, DuplicateProfiler
- [ ] IQR + moving average implementados como métodos complementares ao z-score
- [ ] CUSUM implementado para detecção de deriva lenta
- [ ] Modelagem de sazonalidade (dia da semana + hora do dia) para supressão de falsos positivos
- [ ] Pipeline config permite escolher método de detecção e threshold por métrica
- [ ] Métricas no `metrics_json` dos PipelineRuns refletem todos os novos profilers
- [ ] AnomalyDetailPage mostra qual método detectou, quais métricas dispararam, e gráfico de tendência
- [ ] Motor detecta 90%+ em dataset sintético com anomalias conhecidas (spike, deriva, duplicata, frescor)
- [ ] Testes unitários para cada novo profiler e algoritmo de detecção

### Fase 2 — Onboarding
- [ ] Script `get.beacon.app` que instala agente, pede token, conecta e sobe primeiro perfil em 1 comando
- [ ] Auto-discovery: agente faz scan do banco, sobe tabelas pro cloud, dashboard mostra "Encontramos N tabelas"
- [ ] Wizard de onboarding (3 passos visuais pós-login) substituindo Landing Page genérica
- [ ] Baseline reduzido de 30 para 5-7 corridas com badge "confiança: média — baseline imaturo"
- [ ] Notificações via Slack (webhook)
- [ ] Digest de alertas (agrupar por período: 15min, 1h, diário)
- [ ] Blackout window por pipeline (campo `blackout_window` no modelo)
- [ ] Settings/Preferências: canais de alerta, frequência de digest, blackout windows

### Fase 3 — Segurança
- [ ] mTLS entre agente e cloud com certificate pinning
- [ ] SQLite local do agente criptografado com SQLCipher (AES-256)
- [ ] Payload signing (HMAC) em todos os uploads do agente
- [ ] Build reproduzível do agente + SBOM + Cosign
- [ ] Agente declara modo read-only (selo visual no dashboard)
- [ ] Audit log do agente visível no dashboard (WORM, imutável)
- [ ] MFA (TOTP) + SSO (Google/Okta/Azure AD)
- [ ] Rotação automática de tokens do agente
- [ ] Multi-member + RBAC (Owner, Admin, Editor, Viewer) com permissões granulares
- [ ] Workspace/Membros: convidar, gerenciar papéis

### Fase 4 — Expansão
- [ ] MySQL connector (aiomysql)
- [ ] BigQuery connector (Google Cloud SDK)
- [ ] Google Sheets connector (Google Sheets API)
- [ ] Dashboard: timeline de saúde com sparklines por tabela
- [ ] AnomalyDetail: gráficos de distribuição (baseline vs atual) com Recharts
- [ ] Hover diffs no feed de anomalias (mini comparação antes/depois)
- [ ] Relatório semanal automático: config, preview, histórico
- [ ] Agente modo daemon (systemd/Docker) + agendamento automático de pipelines

---

## Technical Approach

**Decision:** Roadmap em 4 fases sequenciais com gates de qualidade. Cada fase tem dependências da anterior e produz valor independente.

**Origin:** collaborative — product strategy session

**Rationale:**
- Fase 1 primeiro porque é a fundação: sem um motor que cumpre a promessa, nada mais importa.
- Fase 2 segundo porque sem onboarding fluido, o motor melhorado não é descoberto.
- Fase 3 terceiro porque segurança é amplificador: depois que o produto funciona, o selo de confiança expande o mercado.
- Fase 4 quarto porque conectores e dashboard rico são amplificação de um produto que já entrega valor.

**PROJECT_CONTEXT.md constraints:**
- Stack: Python 3.13 + FastAPI (backend), React 19 + TypeScript + TailwindCSS v4 (frontend)
- Padrão de camadas: domain → application → infrastructure → presentation
- Design system: 23 componentes existentes cobrem ~80% das necessidades visuais
- Testes: unitários (Vitest/pytest), integração (pytest + asyncpg), E2E (Playwright)
- Segurança: Fernet (já existe), SQLCipher (novo), Cosign (novo)

---

## Architecture Fit

Todas as 4 fases seguem a arquitetura híbrida existente:
- **Backend:** Modular Monolith com camadas domain/application/infrastructure/presentation
- **Frontend:** Feature-based organization com React Query + MSW
- **Agente:** Módulo Python independente com conectores e profilers
- **Infra:** Docker Compose dev, CI/CD GitHub Actions, Render deploy

---

## 📋 Fase 1 — Motor de Detecção (Detalhamento)

### Objetivo
Levar a detecção de 3/10 para 7/10. O motor passa a detectar: spikes (z-score/IQR), deriva lenta (CUSUM), duplicatas, falta de frescor, corrupção de formato, e mudanças de distribuição — com supressão de falsos positivos por sazonalidade.

### Backend Tasks — Agente (agent/)

| # | Task | Descrição | Esforço |
|---|------|-----------|---------|
| 1.1 | **CardinalityProfiler** — `agent/profiling/cardinality.py` | Conta valores distintos por coluna. Detecta quando `COUNT(DISTINCT col)` desvia do baseline (>2σ = possível duplicata ou colapso de cardinalidade). | 🟢 Baixo |
| 1.2 | **DistributionProfiler** — `agent/profiling/distribution.py` | Calcula min, P5, P25, P50, P75, P95, max por coluna numérica. Alimenta gráficos de distribuição no dashboard. | 🟢 Baixo |
| 1.3 | **FreshnessProfiler** — `agent/profiling/freshness.py` | Detecta `MAX(updated_at)` ou `MAX(timestamp_col)` e compara com baseline. Se a última data está X horas atrás do esperado → anomalia de frescor. | 🟢 Baixo |
| 1.4 | **FormatProfiler** — `agent/profiling/format.py` | Para colunas de string, verifica % de valores que batem com regex esperado (email, UUID, phone). Se % de mismatch sobe → possível corrupção de formato. | 🟡 Médio |
| 1.5 | **DuplicateProfiler** — `agent/profiling/duplicate.py` | Conta `COUNT(*) - COUNT(DISTINCT *)` ou combinação de colunas-chave. Se % de duplicatas sobe → bug em ETL. | 🟢 Baixo |
| 1.6 | **IQR + moving average** — `agent/detection.py` | Adicionar métodos `_iqr_score()` e `_moving_average_score()` ao lado do `_z_score()` existente. IQR é robusto contra outliers. Moving average suaviza ruído. | 🟢 Baixo |
| 1.7 | **CUSUM** — `agent/detection.py` | Algoritmo de soma cumulativa para deriva lenta. Acumula desvios pequenos ao longo do tempo; dispara quando soma cruza threshold. Resolve o caso "coluna mudou 2% ao dia por 3 semanas". | 🟡 Médio |
| 1.8 | **Sazonalidade** — `agent/detection.py` | Modela padrão dia-da-semana e hora-do-dia. Calcula baseline por fatia temporal (ex: "volume esperado segunda 9h"). Só alerta se desvio é anormal PARA AQUELE HORÁRIO. | 🟡 Médio |
| 1.9 | **Pipeline config detection_method** — `app/domain/models.py` | Campo `detection_method` no modelo Pipeline: `z_score`, `iqr`, `moving_avg`, `cusum`, `auto`. Campo `thresholds` (JSONB) por métrica. | 🟢 Baixo |
| 1.10 | **Migration** — `alembic/versions/` | Adicionar colunas `detection_method` e `thresholds` ao modelo Pipeline. | 🟢 Baixo |
| 1.11 | **ProfileRunner atualizado** — `agent/profiling/runner.py` | Orquestrar novos profilers. `target_tables` validation mantida. | 🟢 Baixo |
| 1.12 | **Testes unitários** — `agent/tests/` | Testes para cada novo profiler (mock asyncpg), testes para IQR, moving average, CUSUM, sazonalidade. Cenários: spike, deriva, duplicata, frescor, falso positivo sazonal. | 🟡 Médio |

### Backend Tasks — Cloud (app/)

| # | Task | Descrição | Esforço |
|---|------|-----------|---------|
| 1.13 | **Pipeline schemas** — `app/domain/schemas.py` | Atualizar `PipelineCreate`/`PipelineUpdate` com campos `detection_method` e `thresholds`. | 🟢 Baixo |
| 1.14 | **PipelineService** — `app/application/pipeline_service.py` | Validar `detection_method` e `thresholds` no create/update. | 🟢 Baixo |
| 1.15 | **PipelineRunner** — `app/application/pipeline_runner.py` | Passar `detection_method` e `thresholds` do pipeline para o `_detect_anomaly()`. | 🟢 Baixo |
| 1.16 | **AnomalyDetector cloud** — `app/application/detection.py` | Wrapper cloud que recebe `detection_method` e delega para o algoritmo correto. | 🟢 Baixo |
| 1.17 | **Testes unitários cloud** — `tests/application/` | Atualizar `test_pipeline_runner.py` e `test_detection.py` para novos métodos. | 🟢 Baixo |

### Frontend Tasks — UI (Designer + Executor)

| # | Task | Descrição | Esforço |
|---|------|-----------|---------|
| 1.18 | 🎨 **AnomalyDetailPage — redesign** | Mostrar: (a) método de detecção usado (badge: "z-score", "IQR", "CUSUM"), (b) breakdown por métrica: quais dispararam e quais ficaram normais, (c) mini-gráfico de tendência com sparkline do baseline vs atual, (d) recomendação contextual baseada no tipo de anomalia. **Componente novo:** `DetectionMethodBadge`, `MetricBreakdown`, `TrendSparkline`. | 🟡 Médio |
| 1.19 | 🎨 **PipelineForm — thresholds por métrica** | Adicionar seção "Configuração de Detecção": dropdown de método (z-score/IQR/CUSUM/auto), threshold por métrica (slider ou input numérico), baseline window (slider: 5-100 corridas). **Componente novo:** `ThresholdSlider`. | 🟡 Médio |
| 1.20 | 🎨 **PipelineRunsPage — métricas expandidas** | Coluna de resumo: "3 métricas OK, 1 warning (cardinalidade)". Expandir linha para ver todas as métricas. | 🟢 Baixo |
| 1.21 | 🎨 **DashboardPage — feed mais informativo** | Cada anomalia no feed mostra: método de detecção + métricas afetadas. Ex: "CUSUM: deriva lenta em user_id (cardinalidade -12%)". | 🟢 Baixo |

### Testing Strategy — Fase 1
- **Agente:** 30+ novos testes unitários (mock asyncpg) para cada profiler e algoritmo
- **Backend cloud:** 15+ testes atualizados para novos detection_methods e thresholds
- **Frontend:** Testes de renderização para novos componentes (DetectionMethodBadge, MetricBreakdown, TrendSparkline)
- **Integração:** Dataset sintético com anomalias injetadas (spike, deriva, duplicata, frescor). Motor deve detectar 90%+
- **E2E:** Novo spec: fluxo de pipeline com detection_method customizado → anomalia com breakdown de métricas

### Gate Fase 1
- [ ] Todos os novos profilers com cobertura >90%
- [ ] Dataset sintético: 90%+ de detecção
- [ ] 0 regressões nos testes existentes
- [ ] Frontend: todas as adaptações de tela passam nos testes visuais

---

## 📋 Fase 2 — Onboarding & 5 Minutos (Detalhamento)

### Objetivo
Um novo usuário, partindo do zero, instala o agente, conecta um PostgreSQL, e recebe o primeiro alerta em menos de 5 minutos. O fluxo atual de 15-20 minutos é reduzido eliminando etapas manuais.

### Backend Tasks

| # | Task | Descrição | Esforço |
|---|------|-----------|---------|
| 2.1 | **Auto-discovery endpoint** — `POST /api/v1/agent/self/discover` | Agente sobe lista de tabelas descobertas (nome, schema, colunas, row count estimado). Cloud cria DataSource automaticamente se não existir, e sugere pipelines. | 🟡 Médio |
| 2.2 | **AgentService.auto_discover()** | Recebe payload do agente, cria/atualiza DataSource com status `discovered`, cria pipelines sugeridos (volume + null % + cardinalidade) com config padrão. | 🟡 Médio |
| 2.3 | **GET /api/v1/agent/self/discovery-status** | Retorna status da descoberta: `pending` (não iniciada), `scanning` (em andamento), `completed` (tabelas encontradas), `failed`. | 🟢 Baixo |
| 2.4 | **Baseline reduzido** — `agent/detection.py` | Config `min_baseline_runs`: 5 (padrão). Se baseline < 30 corridas, incluir campo `confidence: "low"` no payload da anomalia. | 🟢 Baixo |
| 2.5 | **Blackout window** — modelo + migration | Campo `blackout_window` (JSONB) no Pipeline: `[{"days": ["sat","sun"], "hours": "02:00-04:00"}]`. AlertDispatcher verifica antes de disparar. | 🟢 Baixo |
| 2.6 | **SlackNotifier** — `app/infrastructure/notifiers/slack.py` | Implementar `SlackNotifier.send_alert()` usando webhook URL. Mesmo padrão do EmailNotifier: `asyncio.to_thread()`, graceful degradation. | 🟢 Baixo |
| 2.7 | **Digest service** — `app/application/digest_service.py` | Agrupar alertas por período configurável. Enviar resumo: "3 anomalias detectadas na tabela orders nas últimas 2h". Tarefa em background (APScheduler ou similar). | 🟡 Médio |
| 2.8 | **User settings** — modelo + endpoints | Modelo `UserSettings`: `digest_frequency`, `slack_webhook_url`, `email_enabled`, `slack_enabled`. Endpoints: `GET/PUT /api/v1/settings`. | 🟡 Médio |
| 2.9 | **Testes** — `tests/application/test_digest_service.py`, `tests/infrastructure/test_slack_notifier.py` | Unit tests com mock para digest e Slack. | 🟢 Baixo |

### Infra Tasks

| # | Task | Descrição | Esforço |
|---|------|-----------|---------|
| 2.10 | **Script de instalação** — `install.sh` | `curl -s https://get.beacon.app | bash`: detecta Python, instala via pip, pede token interativamente, executa `beacon-agent run --token --once`. Publicado em CDN ou GitHub Releases. | 🟡 Médio |

### Frontend Tasks — UI (Designer + Executor)

| # | Task | Descrição | Esforço |
|---|------|-----------|---------|
| 2.11 | 🎨 **Wizard de Onboarding** — NOVA TELA (substitui LandingPage) | **3 passos visuais:** (1) "Instale o agente" — código de 1 linha com botão copiar, indicador de status "Aguardando conexão...", (2) "Conecte seu banco" — preview de connection string com validação, (3) "Pronto!" — mostra tabelas descobertas, checkboxes, botão "Começar a monitorar". **Componentes novos:** `WizardStepper`, `CodeBlock` (já existe?), `ConnectionPreview`, `DiscoveryResult`. | 🔴 Alto |
| 2.12 | 🎨 **Dashboard — estado pós-descoberta** | Quando auto-discovery completa, dashboard mostra banner: "Encontramos N tabelas. Monitorar todas?" com quick actions. Substitui o estado vazio atual. | 🟡 Médio |
| 2.13 | 🎨 **DataSources — estado "discovered"** | Lista de datasources mostra badge "Novo! Aguardando configuração" para recém-descobertos. | 🟢 Baixo |
| 2.14 | 🎨 **PipelineForm — sugestão automática** | Após auto-discovery, formulário vem pré-preenchido: nome = tabela, tipo = auto, métricas sugeridas. | 🟢 Baixo |
| 2.15 | 🎨 **Settings / Preferências** — NOVA TELA | Seções: (a) Canais de Alerta — toggle Email/Slack, webhook URL do Slack, (b) Digest — frequência (15min/1h/6h/diário/semanal), (c) Blackout Windows — lista de pipelines com horários de silêncio. **Componentes novos:** `SchedulePicker`, `WebhookInput`. | 🟡 Médio |
| 2.16 | 🎨 **Integração Slack** — seção/seção em Settings | Conectar workspace Slack: colar webhook URL, testar conexão, escolher canal padrão. | 🟢 Baixo |
| 2.17 | 🎨 **Endpoint functions** — `frontend/src/lib/api.ts` | Adicionar: `getDiscoveryStatus()`, `getUserSettings()`, `updateUserSettings()`, `testSlackWebhook()`. | 🟢 Baixo |

### Testing Strategy — Fase 2
- **Backend:** Testes para auto-discovery endpoint, digest service, Slack notifier, user settings CRUD
- **Frontend:** Testes para Wizard (renderização de cada passo, transições), Settings (salvar/carregar), Dashboard estado pós-descoberta
- **E2E:** Novo spec: fluxo completo de onboarding (login → wizard → instalação simulada → descoberta → primeiro alerta)
- **Script:** Testar `install.sh` em Ubuntu 22.04 e macOS

### Gate Fase 2
- [ ] Novo usuário completa onboarding em <5 minutos (cronometrado)
- [ ] Auto-discovery funciona com PostgreSQL real (tabelas detectadas, pipelines sugeridos)
- [ ] Slack: notificação de teste entregue com sucesso
- [ ] Digest: email de resumo entregue no período configurado
- [ ] Blackout window: alerta NÃO é enviado durante janela de silêncio

---

## 📋 Fase 3 — Segurança Blindada (Detalhamento)

### Objetivo
Tornar segurança o diferencial competitivo. Um CISO revisa a arquitetura e aprova em 24h. A página de segurança do Beacon é o argumento de venda.

### Backend + Agente Tasks

| # | Task | Descrição | Esforço |
|---|------|-----------|---------|
| 3.1 | **mTLS** — agente + cloud | Agente gera par de chaves. Certificado auto-assinado. Cloud verifica fingerprint. Config: `AGENT_MTLS_CERT`, `AGENT_MTLS_KEY`. Cloud: `MTLS_CA_CERT`. | 🟡 Médio |
| 3.2 | **Certificate pinning** — `agent/api_client.py` | Hardcode fingerprint do certificado do cloud. `httpx` client com `verify=custom_ssl_context`. Se fingerprint não bater → conexão recusada. | 🟢 Baixo |
| 3.3 | **SQLCipher** — `agent/storage.py` | Substituir SQLite padrão por SQLCipher. Chave derivada do token do agente via HKDF. `PRAGMA key = '...'` na abertura da conexão. | 🟡 Médio |
| 3.4 | **Payload signing (HMAC)** — `agent/api_client.py` | Cada POST/PUT inclui header `X-Beacon-Signature: HMAC-SHA256(payload, derived_key)`. Cloud verifica no middleware antes de processar. | 🟢 Baixo |
| 3.5 | **HMAC verification middleware** — `app/presentation/api/middleware/auth.py` | Middleware que verifica `X-Beacon-Signature` para requests de agente. Rejeita 401 se assinatura inválida. | 🟢 Baixo |
| 3.6 | **Build reproduzível + SBOM + Cosign** — CI | `agent-ci.yml`: build determinístico, gerar SBOM (SPDX via `pip-audit`), assinar binário com Cosign, publicar hash + assinatura no GitHub Releases. | 🟡 Médio |
| 3.7 | **Audit log do agente** — `agent/audit.py` + `app/application/audit_service.py` | Agente registra toda ação (connect, profile, detect, upload) com timestamp e hash. Sobe pro cloud periodicamente. Cloud armazena em tabela `audit_logs` imutável (WORM: sem UPDATE/DELETE, só INSERT). | 🟡 Médio |
| 3.8 | **MFA (TOTP)** — `app/application/auth_service.py` | Registrar segredo TOTP, gerar QR code, verificar código. Endpoints: `POST /auth/mfa/setup`, `POST /auth/mfa/verify`, `POST /auth/mfa/disable`. Códigos de backup (8 x 8 dígitos, hash SHA-256). | 🟡 Médio |
| 3.9 | **SSO (OIDC)** — `app/application/auth_service.py` | Login via Google, Okta, Azure AD. Flow OAuth 2.0 + OIDC. Endpoints: `GET /auth/sso/{provider}/login`, `GET /auth/sso/{provider}/callback`. Mapear claims OIDC → User. | 🔴 Alto |
| 3.10 | **Rotação de token** — `app/application/agent_service.py` | Campo `expires_at` no AgentToken. Agente detecta expiração próxima e chama `POST /agent/self/rotate-token`. Token antigo revogado, novo gerado. | 🟢 Baixo |
| 3.11 | **Multi-member + RBAC** — modelos + serviços | Modelo `Workspace`, `WorkspaceMember` (role: owner/admin/editor/viewer). Permissões granulares: `can_view_dashboard`, `can_manage_pipelines`, `can_manage_agents`, `can_view_config`. Middleware de autorização: `require_permission(scope)`. | 🔴 Alto |
| 3.12 | **Migrações** — `alembic/versions/` | Tabelas: `workspaces`, `workspace_members`, `audit_logs`, `user_mfa`, campos `expires_at` em `agent_tokens`. | 🟡 Médio |
| 3.13 | **Testes** — `tests/` | Unit tests: HMAC verification, TOTP generation/verification, RBAC permission checks, token rotation. | 🟡 Médio |

### Frontend Tasks — UI (Designer + Executor)

| # | Task | Descrição | Esforço |
|---|------|-----------|---------|
| 3.14 | 🎨 **MFA Setup** — NOVA TELA | (1) Explicação: "Proteja sua conta com autenticação de dois fatores", (2) QR code + código manual, (3) Confirmação: digitar código do app, (4) Códigos de backup (exibir uma vez, botão download). **Componentes novos:** `QRCode`, `BackupCodes`. | 🟡 Médio |
| 3.15 | 🎨 **Login — fluxo MFA** | Após senha correta: tela de "Digite o código do seu autenticador". Campo de 6 dígitos com auto-focus e auto-submit. Link "Usar código de backup". | 🟡 Médio |
| 3.16 | 🎨 **Login — botões SSO** | "Entrar com Google", "Entrar com Okta", "Entrar com Azure AD". Botões com ícones das marcas. | 🟢 Baixo |
| 3.17 | 🎨 **Audit Log** — NOVA TELA | Timeline de ações do agente: filtro por agente, data, ação. Cada entrada: timestamp, agente, ação, detalhes (tabela, métricas, duração). Badge "WORM — registro imutável". **Componente novo:** `AuditTimeline`. | 🟡 Médio |
| 3.18 | 🎨 **AgentDetail — selos de segurança** | Novo bloco: "Postura de Segurança" com badges: 🔒 Read-only verificado, ✅ Binário assinado (Cosign), 🔐 mTLS ativo, 📋 Audit log em dia. Status de conexão mostra "mTLS" em vez de "HTTPS". | 🟢 Baixo |
| 3.19 | 🎨 **Workspace & Membros** — NOVA TELA | Lista de membros com nome, email, papel (badge colorido), último acesso. Botão "Convidar membro" (email + papel). Ações: alterar papel, remover. Tabela de permissões por papel: Viewer (só vê dashboard), Editor (+ gerencia pipelines), Admin (+ gerencia agentes), Owner (tudo + billing). **Componentes novos:** `RoleBadge`, `PermissionMatrix`. | 🔴 Alto |
| 3.20 | 🎨 **Security Dashboard** — NOVA TELA (opcional, mas recomendada) | Visão consolidada: score de segurança do workspace (0-100), agentes com mTLS ativo (X/Y), tokens próximos de expirar, membros sem MFA, últimos acessos suspeitos. Gráfico de tendência de score. | 🟡 Médio |
| 3.21 | 🎨 **Token Management — rotação** | Na lista de tokens: coluna "Expira em", badge de warning se <7 dias. Botão "Rotacionar" inline. | 🟢 Baixo |

### Testing Strategy — Fase 3
- **Backend:** Testes para TOTP (gerar, verificar, rejeitar código errado, backup codes), RBAC (cada papel tenta ações não autorizadas → 403), token rotation, audit log immutability
- **Frontend:** Testes para MFA Setup (renderização QR, confirmação, backup codes), Workspace (convidar, alterar papel, remover), AuditLog (filtros, timeline), Security Dashboard
- **Segurança:** Rodar OWASP ZAP scan, Bandit, pip-audit, npm audit. Revisão manual de fluxos de auth.
- **Penetration test:** Após deploy, contratar ou simular ataque: tentar impersonar agente, tentar ler audit log sem auth, tentar bypass MFA

### Gate Fase 3
- [ ] mTLS funcional: agente rejeita cloud com certificado errado, cloud rejeita agente sem certificado
- [ ] SQLCipher: `beacon_agent.db` ilegível sem chave correta
- [ ] HMAC: payload adulterado → 401
- [ ] MFA: login exige segundo fator, backup code funciona, código errado → rejeitado
- [ ] RBAC: Viewer não vê config, Editor não gerencia agentes, Admin não remove Owner
- [ ] Audit log: imutável (tentar UPDATE via SQL → bloqueado)

---

## 📋 Fase 4 — Expansão (Detalhamento)

### Objetivo
Expandir mercado endereçável (MySQL + BigQuery + Google Sheets), enriquecer a experiência visual (dashboard como mapa de saúde, gráficos de distribuição), e completar o ciclo de engajamento (relatório semanal, agente daemon).

### Backend + Agente Tasks

| # | Task | Descrição | Esforço |
|---|------|-----------|---------|
| 4.1 | **MySQL connector** — `agent/connectors/mysql.py` | Usar `aiomysql`. Mesmas interfaces do PostgresConnector: `get_tables()`, `get_schema()`, `get_row_count()`, `get_null_counts()`, `get_basic_stats()`. | 🟢 Baixo |
| 4.2 | **BigQuery connector** — `agent/connectors/bigquery.py` | Usar `google-cloud-bigquery` SDK. Adaptar para SQL do BigQuery (diferenças de sintaxe). Profiling com amostragem (TABLESAMPLE ou `LIMIT` com `RAND()`). | 🟡 Médio |
| 4.3 | **Google Sheets connector** — `agent/connectors/sheets.py` | Usar `google-api-python-client`. "Tabelas" = abas da planilha. "Colunas" = cabeçalhos da primeira linha. Profiling adaptado: row count, null %, cardinalidade de valores. | 🟡 Médio |
| 4.4 | **Agente daemon** — `agent/cli.py` | Modo `beacon-agent run --daemon`: loop infinito com intervalo configurável. Suporte a systemd (unit file), Docker (healthcheck), e sinalização (SIGTERM graceful shutdown). | 🟡 Médio |
| 4.5 | **Pipeline scheduler** — `agent/scheduler.py` ou cloud-side | Ler campo `schedule` (cron) do pipeline. Agendar execuções via APScheduler ou similar. Respeitar `enabled` e `blackout_window`. | 🟡 Médio |
| 4.6 | **Relatório semanal** — `app/application/report_service.py` | Gerar relatório: resumo de anomalias da semana, tendência, tabelas mais problemáticas. Template HTML. Envio via EmailNotifier. Endpoint: `POST /api/v1/workspace/report/send`. | 🟡 Médio |
| 4.7 | **Testes** — `agent/tests/connectors/` | Testes para MySQL, BigQuery, Sheets connectors (mock das respectivas libs). Testes para scheduler e daemon mode. | 🟡 Médio |

### Frontend Tasks — UI (Designer + Executor)

| # | Task | Descrição | Esforço |
|---|------|-----------|---------|
| 4.8 | 🎨 **Dashboard — redesign completo (Timeline de Saúde)** | Cards de status evoluem para sparklines de 30 dias: cada tabela monitorada tem um mini-gráfico (verde/amarelo/vermelho). Nova seção: "Em degradação" — tabelas com tendência de piora (early warning). Seção de anomalias recentes ganha hover diffs: passar mouse mostra mini comparação antes/depois. **Componentes novos:** `HealthTimeline`, `SparklineChart`, `HoverDiff`. | 🔴 Alto |
| 4.9 | 🎨 **AnomalyDetail — gráficos de distribuição** | Baseline vs atual lado a lado: histograma da distribuição (Recharts), tabela de percentis comparados, gráfico de tendência temporal da métrica. Drill-down: clicar em coluna → perfil detalhado (tipo, nulos, cardinalidade, distribuição). **Lib nova:** `recharts`. | 🔴 Alto |
| 4.10 | 🎨 **DataSourceForm — novos conectores** | Type selector expandido: PostgreSQL, MySQL, BigQuery, Google Sheets. Cada tipo mostra formulário específico: MySQL (host/port/user/pass/db), BigQuery (project ID, dataset, credentials JSON upload), Google Sheets (spreadsheet URL, auth via OAuth). Validação de conexão em tempo real ("Testar conexão"). | 🟡 Médio |
| 4.11 | 🎨 **Relatório Semanal — NOVA TELA** | Config: dia/horário, destinatários (emails), quais tabelas incluir, seções do relatório. Preview: gerar e visualizar no browser. Histórico: lista de relatórios passados com data e link. Botão "Enviar agora" para teste. **Componentes novos:** `ReportPreview`, `ReportConfig`. | 🟡 Médio |
| 4.12 | 🎨 **Agent Detail — modo daemon** | Status do agente: "Rodando como serviço (systemd)" ou "Docker container" ou "CLI manual". Uptime, última execução agendada, próxima execução. Config de schedule: crontab visual. | 🟢 Baixo |
| 4.13 | 🎨 **Endpoint functions** — `frontend/src/lib/api.ts` | Adicionar: `getHealthTimeline()`, `getReportConfig()`, `updateReportConfig()`, `previewReport()`, `sendReport()`, `testDataSourceConnection()`. | 🟢 Baixo |

### Testing Strategy — Fase 4
- **Agente:** Testes para cada novo connector (MySQL, BigQuery, Sheets) com mocks das libs
- **Backend:** Testes para scheduler, relatório semanal (geração HTML, envio)
- **Frontend:** Testes para Dashboard redesign (sparklines, hover diffs, timeline), AnomalyDetail com Recharts (snapshot testing), novos formulários de connector
- **E2E:** Novos specs: MySQL connector setup, Google Sheets connector setup, relatório semanal fluxo completo

### Gate Fase 4
- [ ] MySQL: profiling funcional em banco real
- [ ] BigQuery: profiling funcional (atenção a custos — usar sandbox)
- [ ] Google Sheets: profiling funcional em planilha pública
- [ ] Agente daemon: `systemctl status beacon-agent` mostra "active (running)"
- [ ] Dashboard: sparklines renderizam, hover diffs funcionais
- [ ] Relatório semanal: preview gerado, email enviado, histórico acessível

---

## 🎨 Design System Impact — Resumo para o Designer

### Componentes Novos a Criar

| Componente | Fase | Descrição | Dependências |
|-----------|------|-----------|-------------|
| `DetectionMethodBadge` | 1 | Badge colorido: "z-score" (azul), "IQR" (verde), "CUSUM" (roxo), "auto" (cinza) | Variação da `Badge` existente |
| `MetricBreakdown` | 1 | Lista de métricas com status: ícone ✓ (normal) ou ⚠ (anomalia), nome da métrica, valor atual vs baseline, delta % | `StatusDot`, `Table` |
| `TrendSparkline` | 1 | Mini gráfico SVG inline (30 dias) com linha de tendência | Novo |
| `ThresholdSlider` | 1 | Slider numérico com rótulo e valor atual | `Input` |
| `WizardStepper` | 2 | Steps horizontais numerados (1, 2, 3) com estado: done (✓), active (azul), pending (cinza) | Novo |
| `DiscoveryResult` | 2 | Card com nome da tabela, colunas, row count, checkbox "Monitorar" | `Card`, `Checkbox` |
| `SchedulePicker` | 2 | Interface visual para criar blackout windows: dias da semana (toggle buttons), horário (time inputs) | Novo |
| `WebhookInput` | 2 | Input de URL com botão "Testar conexão" e indicador de status | `Input`, `Button` |
| `QRCode` | 3 | Renderizar QR code a partir de string (lib: `qrcode.react`) | Lib externa |
| `BackupCodes` | 3 | Grid de códigos de 8 dígitos, botão copiar/download | Novo |
| `AuditTimeline` | 3 | Timeline vertical com ícones por tipo de ação, filtro por agente/data | Novo |
| `RoleBadge` | 3 | Badge colorido: Owner (dourado), Admin (azul), Editor (verde), Viewer (cinza) | Variação da `Badge` |
| `PermissionMatrix` | 3 | Tabela de permissões: linhas = papéis, colunas = ações, células = ✓/✗ | `Table` |
| `HealthTimeline` | 4 | Grid de sparklines: cada card = 1 tabela com mini gráfico + score atual | `Card`, `SparklineChart` |
| `SparklineChart` | 4 | SVG sparkline com gradiente de cor (verde→vermelho) | Novo (Recharts ou SVG puro) |
| `HoverDiff` | 4 | Tooltip/popover com comparação antes/depois: duas colunas lado a lado | Variação do `Tooltip` |
| `ReportPreview` | 4 | Renderização HTML de relatório em iframe ou div com scroll | Novo |
| `ReportConfig` | 4 | Formulário: dia/horário, destinatários (multi-email input), checkboxes de tabelas | `Input`, `Checkbox`, `Select` |
| `ToggleSwitch` | 2 | Toggle on/off com label + descrição | Novo |
| `DetectionMethodCard` | 1 | Radio card com ícone + nome + descrição + estado selected | Novo |
| `StatusIndicator` | 2 | Dot pulsante com texto de status (waiting/connected/error) | Novo |
| `PinInput` | 3 | N inputs numéricos com auto-focus e auto-submit | Novo |
| `ScoreGauge` | 3 | Círculo com score 0-100 + cor dinâmica + label | Novo |
| `SecurityItem` | 3 | Card com ícone + título + métrica + status colorido | Novo |
| `DegradationAlert` | 4 | Banner warning com lista de tabelas degradando | Variação do `ErrorPanel` |
| `MetricSummaryRow` | 1 | Mini-lista de métricas com dots coloridos dentro de célula de tabela | `StatusDot` |

### Telas Novas

| Tela | Fase | Prioridade | Protótipo HTML | Descrição |
|------|------|-----------|----------------|-----------|
| **Wizard de Onboarding** | 2 | 🔴 CRÍTICA | `onboarding-wizard.html` | 3 passos: instalar, conectar, monitorar. Substitui Landing Page atual. |
| **Settings / Preferências** | 2 | 🟡 ALTA | `settings.html` | Canais de alerta, digest, blackout windows |
| **MFA Setup** | 3 | 🟡 ALTA | `mfa-setup.html` | QR code, confirmação, códigos de backup |
| **Audit Log** | 3 | 🟡 ALTA | `audit-log.html` | Timeline de ações do agente |
| **Workspace & Membros** | 3 | 🔴 CRÍTICA | `workspace-members.html` | Lista de membros, convite, papéis, permissões |
| **Security Dashboard** | 3 | 🟢 MÉDIA | `security-dashboard.html` | Score de segurança consolidado |
| **Relatório Semanal** | 4 | 🟡 ALTA | `weekly-report.html` | Config, preview, histórico |
| **Dashboard — Redesign** | 4 | 🔴 CRÍTICA | `dashboard-redesign.html` | Timeline de saúde, sparklines, hover diffs |

### Telas Existentes a Adaptar

| Tela | Fase | Protótipo HTML | O que muda |
|------|------|----------------|-----------|
| **AnomalyDetailPage** | 1 + 4 | `anomaly-detail.html` | Fase 1: método de detecção, breakdown de métricas, sparkline. Fase 4: gráficos de distribuição (Recharts), drill-down por coluna. |
| **PipelineForm** | 1 + 2 | `pipeline-form.html` | Fase 1: detection method, thresholds por métrica, baseline window. Fase 2: sugestão automática pós-discovery. |
| **PipelineRunsPage** | 1 | `pipeline-runs.html` | Coluna de resumo expandida, métricas detalhadas no expand. |
| **DashboardPage** | 1 + 2 + 4 | `dashboard.html` (F1) → `dashboard-redesign.html` (F4) | Fase 1: feed mais informativo. Fase 2: banner pós-descoberta. Fase 4: redesign completo com timeline de saúde. |
| **LoginPage** | 3 | — (adaptar existente) | MFA (segundo passo), botões SSO |
| **RegisterPage** | 3 | — (adaptar existente) | Opção de SSO |
| **AgentDetailPage** | 3 + 4 | — (adaptar existente) | Selos de segurança, status mTLS, modo daemon (Fase 4) |
| **DataSourceForm** | 4 | — (adaptar existente) | Novos tipos: MySQL, BigQuery, Google Sheets |
| **DataSourcesListPage** | 2 | — (adaptar existente) | Estado "discovered" com badge |
| **LandingPage** | 2 | — (substituída) | Substituída pelo Wizard de Onboarding (`onboarding-wizard.html`) |

### Total de Trabalho de Design

- **8 telas novas** (Wizard, Settings, MFA, Audit Log, Membros, Security Dashboard, Relatório, Dashboard redesign)
- **10 telas adaptadas** (AnomalyDetail, PipelineForm, PipelineRuns, Dashboard, Login, Register, AgentDetail, DataSourceForm, DataSourcesList, LandingPage → substituída)
- **27 novos componentes** (14 variações de existentes + 13 totalmente novos + 2 libs externas)
- **2 libs novas:** `recharts` (Fase 4, gráficos de distribuição), `qrcode.react` (Fase 3, MFA)

### 📊 Dependências entre Componentes

Componentes devem ser implementados nesta ordem (dependência → dependente):

```
Fase 1:
  DetectionMethodBadge (átomo) ──► usado em: AnomalyDetailPage, DashboardPage
  StatusDot (já existe) ──► usado em: MetricBreakdown, MetricSummaryRow, AuditTimeline
  MetricSummaryRow ──► usado em: PipelineRunsPage
  TrendSparkline ──► usado em: AnomalyDetailPage
  MetricBreakdown ──► usado em: AnomalyDetailPage
  DetectionMethodCard ──► usado em: PipelineForm
  ThresholdSlider ──► usado em: PipelineForm

Fase 2:
  WizardStepper (átomo) ──► usado em: OnboardingWizardPage
  StatusIndicator ──► usado em: OnboardingWizardPage
  ToggleSwitch ──► usado em: SettingsPage, PipelineForm (ThresholdRow)
  WebhookInput ──► usado em: SettingsPage
  SchedulePicker ──► usado em: SettingsPage
  DiscoveryResult ──► usado em: OnboardingWizardPage (Step 2)

Fase 3:
  RoleBadge (átomo) ──► usado em: WorkspacePage
  PinInput ──► usado em: MfaSetupPage
  QRCode ──► usado em: MfaSetupPage (lib: qrcode.react)
  BackupCodes ──► usado em: MfaSetupPage
  PermissionMatrix ──► usado em: WorkspacePage
  AuditTimeline ──► usado em: AuditLogPage
  ScoreGauge ──► usado em: SecurityDashboardPage
  SecurityItem ──► usado em: SecurityDashboardPage

Fase 4:
  SparklineChart (átomo) ──► usado em: HealthTimeline, DashboardPage
  HealthTimeline ──► usado em: DashboardPage (redesign)
  HoverDiff ──► usado em: DashboardPage (redesign)
  DegradationAlert ──► usado em: DashboardPage (redesign)
  ReportConfig ──► usado em: WeeklyReportPage
  ReportPreview ──► usado em: WeeklyReportPage
```

### 🧭 Sidebar Navigation — Evolução por Fase

O componente `Sidebar` (`frontend/src/components/layout/Sidebar.tsx`) ganha novos itens conforme as fases progridem:

**Estado atual (pré-fases):**
```
📊 Dashboard
🔗 Data Sources
⚙️ Pipelines
⚠️ Anomalies
🔔 Alerts
🤖 Agents
```

**Após Fase 2:** adicionar item `⚡ Settings` (aponta para `/settings`)
```
📊 Dashboard
🔗 Data Sources
⚙️ Pipelines
⚠️ Anomalies
🔔 Alerts
🤖 Agents
⚡ Settings          ← NOVO (Fase 2)
```

**Após Fase 3:** adicionar item `🔒 Security` (aponta para `/security`) com submenu: Audit Log (`/security/audit`), Members (`/workspace/members`)
```
📊 Dashboard
🔗 Data Sources
⚙️ Pipelines
⚠️ Anomalies
🔔 Alerts
🤖 Agents
🔒 Security          ← NOVO (Fase 3)
   ├─ Dashboard
   ├─ Audit Log
   └─ Members
⚡ Settings
```

**Após Fase 4:** adicionar item `📋 Reports` (aponta para `/reports`)
```
📊 Dashboard
📋 Reports           ← NOVO (Fase 4)
🔗 Data Sources
⚙️ Pipelines
⚠️ Anomalies
🔔 Alerts
🤖 Agents
🔒 Security
⚡ Settings
```

**Implementação:** Cada item de sidebar é condicional baseado em feature flags ou na existência das rotas. A ordem dos itens segue a prioridade visual (Dashboard sempre primeiro, Settings sempre último).

### TypeScript Types — Localização

Novos tipos vão em `frontend/src/types/` (seguindo padrão existente):

| Arquivo | Tipos |
|---------|-------|
| `frontend/src/types/anomaly.ts` | `MetricResult`, `AnomalyDetail`, `SparklineData` |
| `frontend/src/types/pipeline.ts` | `DetectionMethod`, `MetricThreshold`, `PipelineRunMetric`, `BlackoutWindow` |
| `frontend/src/types/settings.ts` 🆕 | `UserSettings`, `DigestFrequency` |
| `frontend/src/types/security.ts` 🆕 | `MfaSetup`, `AuditEntry`, `AuditFilters`, `SecurityDashboard`, `SecurityScore` |
| `frontend/src/types/workspace.ts` 🆕 | `WorkspaceMember`, `Role`, `RolePermission` |
| `frontend/src/types/reports.ts` 🆕 | `ReportConfig`, `ReportHistoryEntry`, `TableHealth` |

---

## 📊 Implementação — Ordem de Execução

### Dependências entre fases

```
Fase 1 (Motor) ──► Fase 2 (Onboarding) ──► Fase 3 (Segurança) ──► Fase 4 (Expansão)
     │                    │                      │                      │
     └─ Backend pesado    └─ Frontend pesado     └─ Misto              └─ Misto rico
```

As fases são sequenciais. Cada fase produz valor independente e pode ser shipped separadamente. A Fase 1 é a única com dependência forte — sem ela, as outras fases amplificam um motor fraco.

### Ordem dentro de cada fase

**Fase 1 — Motor:**
1. Novos profilers no agente (tasks 1.1-1.5) — fundação
2. IQR + moving average + CUSUM + sazonalidade (1.6-1.8) — algoritmos
3. Pipeline config + migration (1.9-1.10) — modelo de dados
4. ProfileRunner + PipelineRunner atualizados (1.11, 1.15-1.16) — orquestração
5. Schemas + service cloud (1.13-1.14) — API
6. Testes agente + cloud (1.12, 1.17)
7. Frontend adaptações (1.18-1.21) — UI (designer entrega mockups antes; executor implementa depois)

**Fase 2 — Onboarding:**
1. Designer: Wizard, Settings, Slack (2.11, 2.15, 2.16) — mockups primeiro
2. Auto-discovery backend (2.1-2.3) — API
3. Script de instalação (2.10) — infra
4. Slack notifier + digest + blackout (2.6-2.7, 2.5) — notificações
5. User settings (2.8) — preferências
6. Baseline rápido (2.4) — agente
7. Frontend implementação: Wizard, Dashboard estado descoberta, Settings, Slack, endpoint functions (2.11-2.17)

**Fase 3 — Segurança:**
1. Designer: MFA, Membros, Audit Log, Security Dashboard (3.14, 3.17, 3.19, 3.20)
2. mTLS + pinning (3.1-3.2) — agente
3. SQLCipher (3.3) — agente
4. HMAC signing + verification (3.4-3.5) — agente + cloud
5. MFA + SSO (3.8-3.9) — backend auth
6. RBAC + Workspace (3.11) — modelos + API
7. Audit log (3.7) — agente + cloud
8. Build reproduzível + Cosign (3.6) — CI
9. Rotação de token (3.10)
10. Migrações (3.12)
11. Frontend implementação (3.14-3.21)

**Fase 4 — Expansão:**
1. Designer: Dashboard redesign, AnomalyDetail com gráficos, Relatório Semanal, novos formulários de connector (4.8-4.12)
2. MySQL connector (4.1) — agente
3. BigQuery + Sheets connectors (4.2-4.3) — agente
4. Agente daemon + scheduler (4.4-4.5)
5. Relatório semanal (4.6) — backend
6. Frontend implementação (4.8-4.13)

---

## 🎨 Frontend Implementation Guide — Todas as Telas

Cada tela abaixo referencia seu protótipo HTML em `.opencode/work/design-prototypes/`, lista os componentes React envolvidos, os endpoints consumidos, os estados da página (loading/empty/error), a rota (path), e detalhes de acessibilidade. Isso garante que o executor saiba **exatamente** o que implementar seguindo o novo padrão visual.

---

### Fase 1 — Adaptações (4 telas)

#### 1. AnomalyDetailPage
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/anomaly-detail.html` |
| **Rota** | `/anomalies/:id` |
| **Arquivo** | `frontend/src/features/anomalies/AnomalyDetailPage.tsx` (modificar) |

**Componentes a usar:**
- `Badge` (severidade: critical/danger/warning/success)
- `DetectionMethodBadge` 🆕 — props: `method: 'zscore' | 'iqr' | 'cusum' | 'auto'`
- `MetricBreakdown` 🆕 — props: `metrics: MetricResult[]` onde cada `MetricResult` tem `{ name, type, baseline, current, delta, zscore, status: 'normal' | 'warning' | 'triggered' }`
- `TrendSparkline` 🆕 — props: `{ data: number[], baselineRange: [number, number], anomalyIndex?: number }` → renderiza SVG inline
- `ComparisonBox` (existente) — tabela baseline vs atual
- `Recommendation` (existente)
- `StatusDot` (existente)

**Estados da página:**
- `loading`: Skeleton (componente existente) ocupando o espaço do MetricBreakdown
- `error`: ErrorPanel (existente) com botão retry
- `empty` (anomalia não encontrada): EmptyState com mensagem "Anomaly not found"
- `ready`: Layout completo com breadcrumb + header + cards

**API calls:** `GET /api/v1/anomalies/:id` → retorna `AnomalyDetail` com campos `detection_method`, `metric_breakdown`, `sparkline_data`, `evidence`

**Acessibilidade:** Breadcrumb com `aria-label="Breadcrumb"`. Status dots têm `aria-label` (ex: "Critical severity"). Spinner usa `role="status" aria-busy="true"`.

---

#### 2. PipelineForm
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/pipeline-form.html` |
| **Rota** | `/pipelines/:id/edit` e `/pipelines/new` |
| **Arquivo** | `frontend/src/features/pipelines/PipelineForm.tsx` (modificar) |

**Componentes a usar:**
- `Input`, `Select`, `Button` (existentes)
- `DetectionMethodCard` 🆕 — radio cards: 4 opções (auto, z-score, IQR, CUSUM) com ícone + descrição. Props: `{ selected: string, onChange: (method) => void }`
- `ThresholdRow` 🆕 — toggle + input numérico + nome da métrica. Props: `{ metric: string, value: number, enabled: boolean, onChange: (metric, value, enabled) => void }`
- `ThresholdSlider` 🆕 — slider numérico com rótulo. Props: `{ min, max, step, value, onChange }` → usado para baseline window

**Estados da página:**
- `loading`: Skeleton em cada card section
- `ready`: Formulário completo com 4 seções: Basic Config, Detection Method, Metric Thresholds, Baseline & Seasonality
- `submitting`: Button loading state + disabled inputs
- `error`: ErrorPanel com mensagem do backend

**API calls:** `GET /api/v1/pipelines/:id` (edit), `POST/PUT /api/v1/pipelines` (create/update). Payload inclui `detection_method`, `thresholds` (objeto chave-valor), `baseline_window`.

**Acessibilidade:** Radio cards usam `role="radio"` + `aria-checked`. Toggle switches usam `role="switch"` + `aria-checked`. Slider tem `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.

---

#### 3. PipelineRunsPage
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/pipeline-runs.html` |
| **Rota** | `/pipelines/:id/runs` |
| **Arquivo** | `frontend/src/features/pipelines/PipelineRunsPage.tsx` (modificar) |

**Componentes a usar:**
- `Table` com compound pattern (existente)
- `Badge` (existente) — status: success/warning/error
- `MetricSummaryRow` 🆕 — renderiza as bolinhas coloridas + nome da métrica + valor dentro da célula da tabela. Props: `{ metrics: PipelineRunMetric[] }`

**Layout da célula "Metrics Summary":**
```
<div class="metric-summary">
  <div class="metric-summary-row">
    <span class="dot dot--bad"></span>
    <span class="name">Cardinality</span>
    <span class="value" style="color:red">5.4K (-34%)</span>
  </div>
  <div class="metric-summary-row">
    <span class="dot dot--ok"></span>
    <span class="name">+3 metrics</span>
    <span class="value muted">OK</span>
  </div>
</div>
```

**API calls:** `GET /api/v1/pipelines/:id/runs?limit=50` → cada run inclui `metrics_summary` (array de `{ metric, value, status, delta? }`)

**Estados:** loading (Skeleton nas linhas da tabela), empty ("No runs yet"), ready, error.

---

#### 4. DashboardPage (Fase 1 — feed enriquecido)
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/dashboard.html` |
| **Rota** | `/` |
| **Arquivo** | `frontend/src/pages/DashboardPage.tsx` (modificar) |

**Mudanças da Fase 1:**
- Cada item do feed de anomalias ganha uma linha extra de meta tags: `[MethodBadge] · [metrics afetadas]`
- `MethodBadge` 🆕 inline — props: `{ method, size?: 'sm' | 'md' }`
- Nenhuma mudança estrutural — é enriquecimento de dados existentes

**API calls:** `GET /api/v1/anomalies/recent?limit=5` → cada anomalia agora inclui `detection_method` e `triggered_metrics: string[]`

---

### Fase 2 — Telas Novas (2 telas + integrações)

#### 5. OnboardingWizardPage
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/onboarding-wizard.html` |
| **Rota** | `/onboarding` |
| **Arquivo** | `frontend/src/pages/OnboardingWizardPage.tsx` 🆕 |

**Layout:** Centralizado (fora do Shell/Sidebar — tela standalone como LandingPage). max-width 640px.

**Componentes:**
- `WizardStepper` 🆕 — 3 steps: `[{ label: 'Install Agent', status: 'active' }, { label: 'Connect Database', status: 'pending' }, { label: 'Ready', status: 'pending' }]`. Props: `{ steps: WizardStep[], current: number }`
- `CodeBlock` (existente) — usado para mostrar o comando curl. Props: `{ code: string, language?: string }`
- `StatusIndicator` 🆕 — dot pulsante com texto "Waiting for agent...". Props: `{ status: 'waiting' | 'connected' | 'error', agentName?: string }`

**Estado da página (máquina de estados):**
```
Step 0 (Install): mostra comando curl + status "waiting" → poll `GET /api/v1/agent/self/discovery-status`
  → status=scanning → avança Step 1
Step 1 (Connect): mostra "Scanning database..." com spinner → status=completed → avança Step 2
Step 2 (Ready): mostra tabelas descobertas com checkboxes + botão "Start Monitoring"
  → POST /api/v1/agent/self/discover/confirm → redireciona para Dashboard
```

**API calls:**
- `GET /api/v1/agent/self/discovery-status` (poll a cada 3s)
- `POST /api/v1/agent/self/discover/confirm` (envia array de table names selecionadas)

**Acessibilidade:** Stepper usa `aria-current="step"` no step ativo. Code block tem botão "Copy" com feedback visual. Status indicator usa `aria-live="polite"`.

**Substitui:** LandingPage.tsx → redirecionar `/` para `/onboarding` se usuário não tem agente configurado.

---

#### 6. SettingsPage
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/settings.html` |
| **Rota** | `/settings` |
| **Arquivo** | `frontend/src/pages/SettingsPage.tsx` 🆕 |

**Componentes:**
- `ToggleSwitch` 🆕 — props: `{ checked: boolean, onChange: () => void, label: string, description?: string }`. Renderiza o layout `toggle-row` do protótipo.
- `Input` (existente) — webhook URL
- `Select` (existente) — digest frequency
- `SchedulePicker` 🆕 — usado para blackout windows. Props: `{ value: BlackoutWindow[], onChange }` onde `BlackoutWindow = { days: string[], startTime: string, endTime: string, pipelineId: string }`
- `Button` (existente)

**Sections:**
1. Alert Channels: toggle Email + toggle Slack + webhook URL input + test button
2. Alert Digest: toggle + frequency select
3. Blackout Windows: lista de pipelines com toggle + botão "Add"

**API calls:**
- `GET /api/v1/settings` → retorna `UserSettings`
- `PUT /api/v1/settings` → salva
- `POST /api/v1/settings/test-slack` → testa webhook

**Estados:** loading, ready, saving (button loading), error (por campo ou geral)

---

### Fase 3 — Telas Novas (4 telas + adaptações auth)

#### 7. MfaSetupPage
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/mfa-setup.html` |
| **Rota** | `/settings/security/mfa` |
| **Arquivo** | `frontend/src/pages/MfaSetupPage.tsx` 🆕 |

**Componentes:**
- `QRCode` 🆕 — usa lib `qrcode.react`. Props: `{ value: string, size?: number }`
- `PinInput` 🆕 — 6 inputs numéricos com auto-focus e auto-submit. Props: `{ length: number, onComplete: (code: string) => void }`
- `BackupCodes` 🆕 — grid 4x2 com códigos + botão download. Props: `{ codes: string[] }`
- `Button`, `Card` (existentes)

**Fluxo:**
1. GET `/api/v1/auth/mfa/setup` → retorna `{ secret, qr_code_url, manual_code }`
2. Usuário escaneia QR / digita código manual
3. Usuário digita código do app no PinInput
4. POST `/api/v1/auth/mfa/verify` com `{ code }` → retorna `{ backup_codes }`
5. Exibe BackupCodes (uma vez) + confirmação

**Acessibilidade:** QR code tem `alt` text explicativo. PinInput cada input tem `aria-label="Digit N"`. Backup codes são selecionáveis (user-select: all).

---

#### 8. AuditLogPage
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/audit-log.html` |
| **Rota** | `/security/audit` |
| **Arquivo** | `frontend/src/pages/AuditLogPage.tsx` 🆕 |

**Componentes:**
- `AuditTimeline` 🆕 — timeline vertical com dots coloridos + filtros. Props: `{ entries: AuditEntry[], filters: { agent, action, dateRange }, onFilterChange }`
- `Select` (existente) — filtros
- `Badge` (existente) — WORM badge
- `Pagination` (existente)

**API calls:** `GET /api/v1/audit?agent_id=&action=&from=&to=&limit=50&offset=0`

**Estados:** loading, empty ("No audit entries found"), ready, error.

---

#### 9. WorkspacePage (Members)
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/workspace-members.html` |
| **Rota** | `/workspace/members` |
| **Arquivo** | `frontend/src/pages/WorkspacePage.tsx` 🆕 |

**Componentes:**
- `Table` (existente) — lista de membros
- `RoleBadge` 🆕 — props: `{ role: 'owner' | 'admin' | 'editor' | 'viewer' }`. Cores: owner=dourado, admin=azul, editor=verde, viewer=cinza
- `PermissionMatrix` 🆕 — tabela só leitura: rows=papéis, cols=permissões, cells=✓/✗. Props: `{ roles: RolePermission[] }`
- `Button` (existente) — "Invite Member"

**API calls:**
- `GET /api/v1/workspace/members` → lista
- `POST /api/v1/workspace/members` → convidar (email + role)
- `PUT /api/v1/workspace/members/:id` → alterar role
- `DELETE /api/v1/workspace/members/:id` → remover

**Estados:** loading, ready, invite modal (Modal existente com Input email + Select role)

---

#### 10. SecurityDashboardPage
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/security-dashboard.html` |
| **Rota** | `/security` |
| **Arquivo** | `frontend/src/pages/SecurityDashboardPage.tsx` 🆕 |

**Componentes:**
- `ScoreGauge` 🆕 — círculo com score 0-100 + label + cor dinâmica. Props: `{ score: number, label: string }`
- `SecurityItem` 🆕 — card com ícone + título + valor + métrica. Props: `{ icon, title, subtitle, metric: { value, status: 'good' | 'warn' | 'bad' } }`
- `Table` (existente) — recent access
- `Button` (existente) — "Rotate" em tokens

**API calls:** `GET /api/v1/security/dashboard` → retorna score + itens + tokens + recent_access

**Estados:** loading (Skeleton nos cards), ready, error.

---

#### Adaptações de Auth (Fase 3)

**LoginPage** — modificar `frontend/src/features/auth/LoginPage.tsx`:
- Após senha correta, se MFA enabled: redirecionar para tela de código (não é página separada — é estado no componente)
- Botões SSO: renderizar botões "Continue with Google" / "Okta" / "Azure AD" abaixo do form. Cada botão é um link `<a href="/api/v1/auth/sso/google/login">`
- O backend redireciona o usuário para o provider OIDC, que redireciona de volta para o callback

**RegisterPage** — modificar `frontend/src/features/auth/RegisterPage.tsx`:
- Adicionar texto "Or sign up with" + botões SSO (mesmo padrão do Login)

---

### Fase 4 — Telas Novas + Adaptações (3 telas)

#### 11. DashboardPage — Redesign Completo
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/dashboard-redesign.html` |
| **Rota** | `/` (mesma rota — redesign substitui versão anterior) |
| **Arquivo** | `frontend/src/pages/DashboardPage.tsx` (reescrever seção de health) |

**Componentes NOVOS:**
- `HealthTimeline` 🆕 — grid de cards de saúde por tabela. Props: `{ tables: TableHealth[] }` onde `TableHealth = { name, score, sparkline: number[], trend: 'up' | 'down' | 'flat', rows, method }`
- `SparklineChart` 🆕 — SVG inline com gradiente. Props: `{ data: number[], width?: number, height?: number, color?: 'green' | 'amber' | 'red' }`
- `HoverDiff` 🆕 — popover que aparece ao passar mouse sobre item do feed de anomalias. Props: `{ baseline: Record<string, string>, current: Record<string, string>, deltas: Record<string, { value: number, direction: 'up' | 'down' }> }`
- `DegradationAlert` 🆕 — banner warning "Early warning: orders is degrading". Props: `{ tables: string[] }`

**Layout:**
1. Status Cards (mantidos da versão atual)
2. 🆕 Health Timeline section (substitui o que era espaço vazio): grid 3x2 de `HealthCard`
3. Banner de DegradationAlert (condicional)
4. Two-column: Anomaly Feed (com HoverDiff) + Pipeline Runs

**API calls:** 
- `GET /api/v1/dashboard/health` → retorna `{ tables: TableHealth[] }`
- `GET /api/v1/anomalies/recent?limit=5` (enriquecido com diff_data para hover)
- `GET /api/v1/pipeline-runs/recent?limit=5` (mantido)

**Estados:** loading (Skeleton para cards + sparklines), empty ("No tables monitored yet"), ready, error parcial (cada seção pode falhar independente).

---

#### 12. WeeklyReportPage
| Campo | Valor |
|-------|-------|
| **Protótipo** | `.opencode/work/design-prototypes/weekly-report.html` |
| **Rota** | `/reports` |
| **Arquivo** | `frontend/src/pages/WeeklyReportPage.tsx` 🆕 |

**Componentes:**
- `ReportConfig` 🆕 — formulário: dia, horário, recipients (input com tags), checkboxes de tabelas. Props: `{ config: ReportConfig, onChange }`
- `ReportPreview` 🆕 — renderiza HTML do relatório em sandbox. Props: `{ html: string }`
- `Table` (existente) — histórico
- `Button` (existente) — "Send Now", "Save"

**API calls:**
- `GET /api/v1/reports/config`
- `PUT /api/v1/reports/config`
- `POST /api/v1/reports/preview` → retorna HTML
- `POST /api/v1/reports/send` → envia agora
- `GET /api/v1/reports/history` → lista de relatórios passados

**Estados:** loading, ready (config + preview + history), sending (button loading).

---

#### Adaptações Fase 4

**DataSourceForm** — modificar `frontend/src/features/datasources/DataSourceForm.tsx`:
- Type selector ganha opções: PostgreSQL, MySQL, BigQuery, Google Sheets
- Cada tipo renderiza formulário condicional específico (campos diferentes por connector)
- Botão "Test Connection" com estado: idle → testing (spinner) → success (✓) / error (✗ + mensagem)
- MySQL: host, port, user, password, database
- BigQuery: project ID, dataset, credentials file upload (JSON)
- Google Sheets: spreadsheet URL, OAuth connect button

**AgentDetailPage** — modificar `frontend/src/features/agents/AgentDetailPage.tsx` (ou AgentsListPage se não existir Detail):

| Campo | Valor |
|-------|-------|
| **Rota** | `/agents/:id` |
| **Arquivo** | `frontend/src/features/agents/AgentDetailPage.tsx` (criar se não existir) |

**Componentes a adicionar:**
- Seção "Security Posture" com ícones/badges coloridos:
  - 🔒 Read-only verified (verde)
  - ✅ Binary attested — Cosign ✓ (verde)
  - 🔐 mTLS active (verde) | ⚠ HTTPS only (amarelo)
  - 📋 Audit log up to date (verde)
- Status de conexão: "mTLS" em vez de "HTTPS" (se ativo)
- Seção "Runtime" (Fase 4):
  - Badge: `systemd service` | `Docker container` | `CLI manual`
  - Uptime (ex: "Up 14d 3h 22m")
  - Última execução agendada + próxima execução
  - Visual cron helper: `<code>*/15 * * * *</code>` com legenda "Every 15 minutes"

**API calls:** `GET /api/v1/agents/:id` → campos novos: `security_posture`, `runtime_mode`, `uptime`, `last_scheduled_run`, `next_scheduled_run`

**Estados:** loading (Skeleton nas seções), ready, error.

---

**DataSourcesListPage** — modificar `frontend/src/features/datasources/DataSourcesListPage.tsx`:
- Adicionar coluna/badge "Discovered" (Fase 2): datasources criados via auto-discovery mostram badge `Novo! Aguardando configuração` (azul claro) até que o usuário configure um pipeline.
- Filtrar por status: All | Configured | Discovered
- API: `GET /api/v1/datasources` → incluir campo `discovery_status: 'manual' | 'discovered'`

---

### 📊 Resumo de Rotas (App.tsx)

```tsx
// Novas rotas a adicionar em frontend/src/App.tsx:
<Route path="/onboarding" element={<OnboardingWizardPage />} />
<Route path="/settings" element={<SettingsPage />} />
<Route path="/settings/security/mfa" element={<MfaSetupPage />} />
<Route path="/security" element={<SecurityDashboardPage />} />
<Route path="/security/audit" element={<AuditLogPage />} />
<Route path="/workspace/members" element={<WorkspacePage />} />
<Route path="/reports" element={<WeeklyReportPage />} />

// Rotas existentes que mudam de componente:
<Route path="/" element={<DashboardPage />} />  
// ↑ Na Fase 1: versão enriquecida. Na Fase 4: redesign completo com HealthTimeline.
//    É o MESMO arquivo — evoluído incrementalmente, não substituído.

<Route path="/anomalies/:id" element={<AnomalyDetailPage />} />
// ↑ Fase 1: detection method + metric breakdown + sparkline. Fase 4: + Recharts gráficos.

<Route path="/pipelines/:id/edit" element={<PipelineForm />} />
// ↑ Fase 1: detection method + thresholds. Fase 2: sugestão automática pós-discovery.

<Route path="/login" element={<LoginPage />} />
// ↑ Fase 3: MFA step + SSO buttons.
```

### 📊 Resumo de Endpoints (api.ts)

```typescript
// Adicionar em frontend/src/lib/api.ts:

// Fase 1
getAnomalyDetail(id: string): Promise<AnomalyDetail>  // atualizado com novos campos

// Fase 2
getDiscoveryStatus(): Promise<DiscoveryStatus>
getUserSettings(): Promise<UserSettings>
updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings>
testSlackWebhook(url: string): Promise<{ success: boolean }>

// Fase 3
setupMfa(): Promise<{ secret, qr_code_url, manual_code }>
verifyMfa(code: string): Promise<{ backup_codes: string[] }>
disableMfa(code: string): Promise<void>
getAuditLog(filters: AuditFilters): Promise<PaginatedResponse<AuditEntry>>
getWorkspaceMembers(): Promise<WorkspaceMember[]>
inviteMember(email: string, role: string): Promise<WorkspaceMember>
updateMemberRole(id: string, role: string): Promise<void>
removeMember(id: string): Promise<void>
getSecurityDashboard(): Promise<SecurityDashboard>

// Fase 4
getHealthTimeline(): Promise<TableHealth[]>
getReportConfig(): Promise<ReportConfig>
updateReportConfig(config: ReportConfig): Promise<ReportConfig>
previewReport(): Promise<{ html: string }>
sendReport(): Promise<void>
getReportHistory(): Promise<ReportHistoryEntry[]>
testDataSourceConnection(config: ConnectionConfig): Promise<{ success: boolean, error?: string }>
```

### 📊 MSW Handlers

Cada novo endpoint precisa de um handler em `frontend/src/test/mocks/handlers.ts`:

```typescript
// Exemplo para Fase 1 — GET anomaly detail enriquecido:
http.get('/api/v1/anomalies/:id', () => {
  return HttpResponse.json({
    data: {
      id: 'anom-001',
      severity: 'critical',
      detection_method: 'cusum',
      metric_breakdown: [
        { name: 'Cardinality (user_id)', type: 'DISTINCT count', status: 'triggered', baseline: '8.2K', current: '5.4K', delta: -34, zscore: 4.8 },
        { name: 'Null % (email)', type: 'NULL ratio', status: 'warning', baseline: '2.1%', current: '7.8%', delta: 271, zscore: 3.2 },
        { name: 'Row Count', type: 'Table volume', status: 'normal', baseline: '124.3K', current: '125.1K', delta: 0.6, zscore: 0.4 },
      ],
      sparkline_data: [/* 42 numbers */],
      evidence: { baseline: {...}, current: {...} },
    },
    error: null,
  });
}),
```

---

## 📁 Resumo de Arquivos — Todo o Roadmap

### Arquivos a Criar

| Arquivo | Fase | Propósito |
|---------|------|-----------|
| `agent/profiling/cardinality.py` | 1 | CardinalityProfiler |
| `agent/profiling/distribution.py` | 1 | DistributionProfiler |
| `agent/profiling/freshness.py` | 1 | FreshnessProfiler |
| `agent/profiling/format.py` | 1 | FormatProfiler |
| `agent/profiling/duplicate.py` | 1 | DuplicateProfiler |
| `agent/connectors/mysql.py` | 4 | MySQL connector |
| `agent/connectors/bigquery.py` | 4 | BigQuery connector |
| `agent/connectors/sheets.py` | 4 | Google Sheets connector |
| `agent/audit.py` | 3 | Audit logging do agente |
| `agent/scheduler.py` | 4 | Pipeline scheduler |
| `app/application/digest_service.py` | 2 | Agrupamento de alertas |
| `app/application/audit_service.py` | 3 | Serviço de audit log cloud |
| `app/application/report_service.py` | 4 | Relatório semanal |
| `app/infrastructure/notifiers/slack.py` | 2 | Slack notifier |
| `app/infrastructure/repositories/workspace_repo.py` | 3 | Workspace CRUD |
| `app/infrastructure/repositories/audit_log_repo.py` | 3 | Audit log repository |
| `app/infrastructure/repositories/user_settings_repo.py` | 2 | User settings CRUD |
| `app/presentation/api/routes/settings.py` | 2 | User settings endpoints |
| `app/presentation/api/routes/workspaces.py` | 3 | Workspace endpoints |
| `app/presentation/api/routes/audit.py` | 3 | Audit log endpoints |
| `app/presentation/api/routes/reports.py` | 4 | Relatório semanal endpoints |
| `tests/agent/profiling/test_cardinality.py` | 1 | Testes CardinalityProfiler |
| `tests/agent/profiling/test_distribution.py` | 1 | Testes DistributionProfiler |
| `tests/agent/profiling/test_freshness.py` | 1 | Testes FreshnessProfiler |
| `tests/agent/profiling/test_format.py` | 1 | Testes FormatProfiler |
| `tests/agent/profiling/test_duplicate.py` | 1 | Testes DuplicateProfiler |
| `tests/agent/connectors/test_mysql.py` | 4 | Testes MySQL connector |
| `tests/agent/connectors/test_bigquery.py` | 4 | Testes BigQuery connector |
| `tests/agent/connectors/test_sheets.py` | 4 | Testes Sheets connector |
| `tests/application/test_digest_service.py` | 2 | Testes digest |
| `tests/application/test_audit_service.py` | 3 | Testes audit |
| `tests/application/test_report_service.py` | 4 | Testes relatório |
| `tests/infrastructure/test_slack_notifier.py` | 2 | Testes Slack notifier |
| `alembic/versions/XXXX_detection_method.py` | 1 | Pipeline detection_method + thresholds |
| `alembic/versions/XXXX_blackout_window.py` | 2 | Pipeline blackout_window |
| `alembic/versions/XXXX_user_settings.py` | 2 | UserSettings table |
| `alembic/versions/XXXX_workspaces.py` | 3 | Workspace + WorkspaceMember tables |
| `alembic/versions/XXXX_audit_logs.py` | 3 | Audit log table |
| `alembic/versions/XXXX_mfa.py` | 3 | User MFA fields |
| `alembic/versions/XXXX_token_expiry.py` | 3 | AgentToken expires_at |
| `install.sh` | 2 | Script de instalação 1-comando |
| `frontend/src/components/ui/DetectionMethodBadge.tsx` | 1 | Badge de método de detecção |
| `frontend/src/components/ui/MetricBreakdown.tsx` | 1 | Breakdown de métricas |
| `frontend/src/components/ui/TrendSparkline.tsx` | 1 | Mini gráfico de tendência |
| `frontend/src/components/ui/ThresholdSlider.tsx` | 1 | Slider de threshold |
| `frontend/src/components/ui/WizardStepper.tsx` | 2 | Passos do wizard |
| `frontend/src/components/ui/DiscoveryResult.tsx` | 2 | Card de tabela descoberta |
| `frontend/src/components/ui/SchedulePicker.tsx` | 2 | Picker de blackout window |
| `frontend/src/components/ui/WebhookInput.tsx` | 2 | Input de webhook com teste |
| `frontend/src/components/ui/QRCode.tsx` | 3 | QR code renderer |
| `frontend/src/components/ui/BackupCodes.tsx` | 3 | Grid de códigos de backup |
| `frontend/src/components/ui/AuditTimeline.tsx` | 3 | Timeline de audit |
| `frontend/src/components/ui/RoleBadge.tsx` | 3 | Badge de papel |
| `frontend/src/components/ui/PermissionMatrix.tsx` | 3 | Matriz de permissões |
| `frontend/src/components/ui/HealthTimeline.tsx` | 4 | Timeline de saúde |
| `frontend/src/components/ui/SparklineChart.tsx` | 4 | Sparkline SVG |
| `frontend/src/components/ui/HoverDiff.tsx` | 4 | Diff hover |
| `frontend/src/components/ui/ReportPreview.tsx` | 4 | Preview de relatório |
| `frontend/src/components/ui/ReportConfig.tsx` | 4 | Config de relatório |
| `frontend/src/components/ui/ToggleSwitch.tsx` | 2 | Toggle on/off |
| `frontend/src/components/ui/DetectionMethodCard.tsx` | 1 | Radio card para método de detecção |
| `frontend/src/components/ui/StatusIndicator.tsx` | 2 | Dot pulsante de status |
| `frontend/src/components/ui/PinInput.tsx` | 3 | Input de código numérico |
| `frontend/src/components/ui/ScoreGauge.tsx` | 3 | Círculo de score (0-100) |
| `frontend/src/components/ui/SecurityItem.tsx` | 3 | Card de métrica de segurança |
| `frontend/src/components/ui/DegradationAlert.tsx` | 4 | Banner de warning |
| `frontend/src/components/ui/MetricSummaryRow.tsx` | 1 | Mini-lista de métricas em tabela |
| `frontend/src/pages/OnboardingWizardPage.tsx` | 2 | Wizard de onboarding |
| `frontend/src/pages/SettingsPage.tsx` | 2 | Configurações do usuário |
| `frontend/src/pages/MfaSetupPage.tsx` | 3 | Setup MFA |
| `frontend/src/pages/AuditLogPage.tsx` | 3 | Audit log |
| `frontend/src/pages/WorkspacePage.tsx` | 3 | Membros do workspace |
| `frontend/src/pages/SecurityDashboardPage.tsx` | 3 | Dashboard de segurança |
| `frontend/src/pages/WeeklyReportPage.tsx` | 4 | Relatório semanal |

### Arquivos a Modificar

| Arquivo | Fases | Mudanças |
|---------|-------|----------|
| `agent/profiling/runner.py` | 1 | Orquestrar novos profilers |
| `agent/detection.py` | 1 | IQR, moving avg, CUSUM, sazonalidade |
| `agent/api_client.py` | 3 | mTLS, certificate pinning, HMAC signing |
| `agent/storage.py` | 3 | SQLCipher |
| `agent/config.py` | 3 | mTLS cert/key paths |
| `agent/cli.py` | 4 | Modo daemon |
| `app/domain/models.py` | 1,2,3 | Pipeline.detection_method/thresholds/blackout_window, UserSettings, Workspace, WorkspaceMember, AuditLog, User.mfa_* |
| `app/domain/schemas.py` | 1,2,3 | Schemas para novos campos e entidades |
| `app/application/pipeline_runner.py` | 1 | Passar detection_method/thresholds |
| `app/application/detection.py` | 1 | Delegar para algoritmo correto |
| `app/application/alert_dispatcher.py` | 2 | Verificar blackout_window |
| `app/application/pipeline_service.py` | 1 | Validar detection_method/thresholds |
| `app/application/auth_service.py` | 3 | MFA (TOTP), SSO (OIDC) |
| `app/presentation/api/router.py` | 2,3,4 | Registrar novas rotas |
| `app/presentation/api/middleware/auth.py` | 3 | HMAC verification, RBAC middleware |
| `app/shared/config.py` | 2,3 | SLACK_WEBHOOK_URL, MTLS_*, OIDC_* |
| `app/infrastructure/database.py` | 3 | Novos modelos |
| `frontend/src/index.css` | 3,4 | Tokens para novos componentes |
| `frontend/src/lib/api.ts` | 2,3,4 | Novas endpoint functions |
| `frontend/src/App.tsx` | 2,3,4 | Novas rotas |
| `frontend/src/features/anomalies/AnomalyDetailPage.tsx` | 1,4 | Método de detecção, breakdown, gráficos |
| `frontend/src/features/pipelines/PipelineForm.tsx` | 1,2 | Detection method, thresholds, sugestão automática |
| `frontend/src/features/pipelines/PipelineRunsPage.tsx` | 1 | Métricas expandidas |
| `frontend/src/pages/DashboardPage.tsx` | 1,2,4 | Feed enriquecido, banner descoberta, redesign |
| `frontend/src/features/datasources/DataSourcesListPage.tsx` | 2 | Estado "discovered" |
| `frontend/src/features/datasources/DataSourceForm.tsx` | 4 | MySQL, BigQuery, Sheets |
| `frontend/src/features/auth/LoginPage.tsx` | 3 | MFA step, SSO buttons |
| `frontend/src/features/auth/RegisterPage.tsx` | 3 | SSO option |
| `frontend/src/features/agents/AgentDetailPage.tsx` (se existir) | 3,4 | Selos de segurança, modo daemon |
| `frontend/src/pages/LandingPage.tsx` | 2 | Substituir por Wizard (redirecionar) |
| `.github/workflows/agent-ci.yml` | 3 | Build reproduzível, Cosign, SBOM |
| `pyproject.toml` | 2,3,4 | Dependências: aiomysql, google-cloud-bigquery, google-api-python-client, pysqlcipher3, qrcode, apscheduler, authlib |
| `frontend/package.json` | 4 | Dependências: recharts, qrcode.react |

---

## 🧪 Testing Strategy — Visão Geral

### Por Fase

| Fase | Unit Tests (pytest) | Unit Tests (Vitest) | E2E (Playwright) | Segurança |
|------|---------------------|---------------------|------------------|-----------|
| **1** | 45+ novos (profilers, algoritmos, detection_method) | 15+ novos (novos componentes) | 1 novo spec | Bandit, ruff |
| **2** | 30+ novos (auto-discovery, digest, Slack, settings) | 25+ novos (Wizard, Settings, estados) | 2 novos specs | Bandit, pip-audit |
| **3** | 40+ novos (MFA, RBAC, audit, HMAC, token rotation) | 30+ novos (MFA, Membros, Audit, Security Dashboard) | 2 novos specs | OWASP ZAP, Bandit, npm audit |
| **4** | 35+ novos (connectors, scheduler, relatório) | 20+ novos (Dashboard redesign, gráficos, relatório) | 3 novos specs | Bandit, pip-audit |
| **Total** | **150+** | **90+** | **8 novos specs** | |

### Coverage Target
- Backend: 85% overall (acima dos 80% atuais)
- Frontend: 85% overall
- Agente: 90% (profiling + detection é core)
- E2E: 8 specs existentes + 8 novos = 16 specs total

---

## 🚦 Gates de Qualidade por Fase

### Fase 1 Gate
- [ ] 5 novos profilers implementados e testados
- [ ] IQR + moving average + CUSUM + sazonalidade testados com dados sintéticos
- [ ] Dataset sintético: 90%+ de detecção (spike, deriva, duplicata, frescor)
- [ ] Backend unit: 0 failures
- [ ] Frontend: adaptações de tela passam nos testes
- [ ] Ruff: 0 errors | Mypy: 0 errors | Bandit: 0 HIGH
- [ ] Review: código revisado, security check passou

### Fase 2 Gate
- [ ] Novo usuário completa onboarding em <5 minutos (cronometrado)
- [ ] Auto-discovery funcional com PostgreSQL real
- [ ] Slack envia notificação de teste
- [ ] Digest agrupa e envia no período configurado
- [ ] Blackout window suprime alertas na janela
- [ ] Backend + Frontend tests: 0 failures
- [ ] E2E: onboarding spec passa

### Fase 3 Gate
- [ ] mTLS funcional (agente rejeita cloud errado, cloud rejeita agente sem cert)
- [ ] SQLCipher: DB ilegível sem chave
- [ ] HMAC: payload adulterado → 401
- [ ] MFA: funciona (TOTP + backup codes)
- [ ] RBAC: cada papel tem permissões corretas
- [ ] Audit log: imutável
- [ ] Cosign: binário verificável
- [ ] OWASP ZAP scan: 0 HIGH/CRITICAL
- [ ] Bandit: 0 issues

### Fase 4 Gate
- [ ] MySQL: profiling funcional
- [ ] BigQuery: profiling funcional (sandbox)
- [ ] Google Sheets: profiling funcional
- [ ] Agente daemon: `systemctl status` mostra active
- [ ] Dashboard: sparklines, hover diffs funcionais
- [ ] Relatório semanal: preview + envio OK
- [ ] Backend + Frontend tests: 0 failures
- [ ] E2E: todos os novos specs passam

---

## 🎯 Resumo Executivo

| Fase | Duração Estimada | Esforço | Valor Entregue |
|------|-----------------|---------|---------------|
| **1 — Motor** | 3-4 semanas | 70% backend, 30% frontend | Detecção que cumpre a promessa (3/10 → 7/10) |
| **2 — Onboarding** | 3-4 semanas | 30% backend, 70% frontend | Setup em <5 min reais, alertas onde o time está |
| **3 — Segurança** | 4-5 semanas | 50% backend, 50% frontend | CISO aprova em 24h, multi-member, MFA, RBAC |
| **4 — Expansão** | 4-5 semanas | 40% backend, 60% frontend | +3 conectores, dashboard rico, relatório semanal |
| **TOTAL** | **14-18 semanas** | Full-stack | Produto completo, seguro, com UX polida |

---

## ⚠️ Riscos e Considerações

### Riscos Técnicos
1. **CUSUM + sazonalidade:** Ajuste de thresholds pode exigir várias iterações com dados reais. Recomendação: usar dataset sintético primeiro, depois calibrar com beta testers.
2. **SQLCipher:** Dependência de `pysqlcipher3` pode ter problemas de build no Windows. Alternativa: `sqlcipher3-binary` com wheels pré-compilados.
3. **BigQuery connector:** Custo de queries. Implementar amostragem agressiva e cache de resultados para evitar surpresas na fatura.
4. **mTLS:** Complexidade de gestão de certificados. Usar auto-assinados com fingerprint pinning (não depender de CA pública).
5. **SSO (OIDC):** Implementação de múltiplos providers é complexa. Começar só com Google, adicionar Okta/Azure depois.
6. **Recharts no frontend:** Lib de gráficos adiciona ~50KB ao bundle. Se for preocupante, usar SVG puro para sparklines e Recharts só para gráficos de distribuição.

### Riscos de Produto
1. **Fadiga de features:** 4 fases é ambicioso. Ship cada fase independentemente — não esperar as 4 para lançar.
2. **Google Sheets como connector:** Nicho, mas diferenciador. Não dedicar mais de 1 sprint.
3. **Multi-member/RBAC:** Exige repensar isolamento de dados (hoje é user-level, vira workspace-level). Maior refatoração do roadmap.

---

## Dependencies

### External
- `aiomysql` — MySQL connector (Fase 4)
- `google-cloud-bigquery` — BigQuery SDK (Fase 4)
- `google-api-python-client` — Google Sheets API (Fase 4)
- `pysqlcipher3` ou `sqlcipher3-binary` — SQLCipher (Fase 3)
- `qrcode` + `Pillow` — QR code generation (Fase 3)
- `authlib` — OIDC/OAuth para SSO (Fase 3)
- `APScheduler` — Pipeline scheduler (Fase 4)
- `recharts` — Gráficos React (Fase 4)
- `qrcode.react` — QR code React (Fase 3)

### Internal
- PROJECT_CONTEXT.md — design system, stack, padrões
- Design system existente (23 componentes) — base para novos componentes
- Estrutura de profilers (`agent/profiling/`) — padrão para novos profilers
- Estrutura de conectores (`agent/connectors/`) — padrão para novos conectores
- Estrutura de notificadores (`app/infrastructure/notifiers/`) — padrão para Slack

---

## Evidence (a ser preenchido)

- **Test Log:** —
- **Coverage:** —
- **Security Scan:** —
- **Review Verdict:** —

---

*Created by @plan-maker*
*Last updated: 2026-06-27 | v3: componente dependency graph + sidebar evolution + types + specs faltantes*
