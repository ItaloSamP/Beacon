# Task: task-implement-figma-screens — Implement All Figma Screens

## Status: PLANNING

## Metadata
- **Type:** feature
- **Scope:** full-stack (frontend-heavy, backend contracts only)
- **Priority:** high
- **Source:** Prompt — "implementar todas as telas do Figma para o projeto Beacon"
- **Figma File:** `uq30Y3KWwjVleDbBJwmlUz`
- **Design Prototypes:** `design-prototypes/*.html` (11 screens)

---

## Problem Statement

O Beacon possui 11 telas desenhadas no Figma (materializadas como protótipos HTML em `design-prototypes/`). O frontend atual implementa algumas telas de forma básica (Login, Register, Dashboard, Agents, DataSources, Anomalies) e outras são apenas placeholders (Pipelines, Alerts). Telas inteiras estão ausentes (Landing Page, Reset Password, Data Source Detail). Nenhuma tela segue fielmente o design system definido nos protótipos — cores, espaçamentos, tipografia, estados (loading, empty, error) e componentes visuais são inconsistentes ou inexistentes.

**Objetivo:** Refazer TODAS as telas existentes com fidelidade 1:1 aos protótipos, implementar as telas novas, construir o design system foundation, preparar todos os endpoints de backend necessários como contratos (MSW handlers), e garantir responsividade, acessibilidade e consistência visual em toda a aplicação.

---

## Acceptance Criteria

- [ ] Todas as 11 telas do Figma têm um componente React correspondente com fidelidade visual 1:1 aos protótipos HTML
- [ ] Todas as telas exibem corretamente todos os estados: default, loading (skeleton), empty (onboarding/vazio), error (com retry), e edge cases documentados
- [ ] Design system foundation implementado: tokens de cor, tipografia, espaçamento, sombras, e raios via Tailwind config + CSS custom properties
- [ ] Todos os 23 componentes UI compartilhados implementados/refinados conforme os protótipos
- [ ] Todas as telas são 100% responsivas (breakpoints: 1024px, 768px, 640px, 480px)
- [ ] Navegação completa entre todas as telas implementada no router
- [ ] MSW handlers cobrem todos os endpoints necessários (existentes + novos contratos)
- [ ] Backend contracts definidos para novos endpoints (Reset Password, DataSource stats, etc.) — documentados, não implementados
- [ ] Todos os textos, labels, placeholders e mensagens correspondem exatamente aos protótipos
- [ ] Acessibilidade WCAG 2.1 AA: contraste 4.5:1, navegação por teclado, screen reader, focus management
- [ ] Testes unitários para todos os componentes UI compartilhados
- [ ] Testes de integração para todas as páginas com MSW mock data

---

## Technical Approach

**Decision:** Design System First — extrair tokens dos protótipos para um `tailwind.config.ts` com tema customizado e construir/refinar todos os componentes UI compartilhados ANTES de montar as páginas.

**Origin:** collaborative (user confirmed approach A from discussion)

**Rationale:** Com 11 telas e 23 componentes compartilhados, construir o design system primeiro garante:
1. Consistência visual — mesmas cores, espaçamentos e padrões em toda a aplicação
2. Reaproveitamento — componentes construídos uma vez, usados em múltiplas telas
3. Manutenibilidade — alterações no design system propagam automaticamente
4. Fidelidade — cada componente é implementado uma vez com precisão, em vez de estilizado inline em cada tela

---

## Architecture Fit

Esta implementação segue a arquitetura definida em `PROJECT_CONTEXT.md` §3:

- **Frontend:** Feature-based organization mantida. Cada feature (auth, dashboard, datasources, agents, pipelines, anomalies, alerts, landing) em seu diretório com componentes, hooks e tipos.
- **Componentes compartilhados:** Expandir `src/components/ui/` com novos componentes e refinar existentes. Manter `src/components/layout/` para Shell, Sidebar, Header, Topbar.
- **State Management:** React Query (TanStack Query) para server state. Manter `src/lib/api.ts` como HTTP client.
- **Routing:** React Router v7 com Shell layout para rotas autenticadas. Novas rotas públicas para Landing Page (condicional) e Reset Password.
- **Styling:** TailwindCSS v4 com tema customizado. CSS custom properties para tokens que Tailwind não cobre nativamente.

---

## Design System Foundation

### Design Tokens

Extrair TODOS os tokens dos protótipos HTML (`:root` blocks) para um tema centralizado.

#### Colors

```
Primary:
  primary-50: #eff6ff, primary-100: #dbeafe, primary-500: #3b82f6
  primary-600: #2563eb, primary-700: #1d4ed8, primary-800: #1e40af, primary-900: #1e3a8a

Semantic:
  success: #16a34a / success-light: #dcfce7 / success-dark: #166534
  warning: #ca8a04 / warning-light: #fef9c3 / warning-dark: #854d0e
  danger: #dc2626 / danger-light: #fee2e2 / danger-dark: #991b1b
  critical: #7c3aed / critical-light: #ede9fe / critical-dark: #6d28d9
  info: #2563eb / info-light: #dbeafe / info-dark: #1e40af
  offline: #9ca3af

Neutral:
  bg: #f9fafb, surface: #ffffff, surface-hover: #f3f4f6
  border: #e5e7eb, border-light: #f3f4f6, border-strong: #d1d5db
  text-primary: #111827, text-secondary: #4b5563, text-muted: #6b7280
  sidebar-bg: #111827, sidebar-hover: #1f2937, sidebar-active: #2563eb
  overlay: rgba(0,0,0,0.5)
```

#### Typography

```
Font: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif
Mono: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace

Sizes: xs: 0.75rem, sm: 0.875rem, base: 1rem, lg: 1.125rem, xl: 1.25rem, 2xl: 1.5rem, 3xl: 1.875rem, 4xl: 2.25rem, 5xl: 3rem, 6xl: 3.75rem
Weights: normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800
Line heights: tight: 1.25, normal: 1.5, relaxed: 1.625
Letter spacing: tight: -0.025em, normal: 0
```

#### Spacing (4px base grid)

```
space-1: 0.25rem, space-2: 0.5rem, space-3: 0.75rem, space-4: 1rem
space-5: 1.25rem, space-6: 1.5rem, space-8: 2rem, space-10: 2.5rem
space-12: 3rem, space-16: 4rem, space-20: 5rem, space-24: 6rem, space-32: 8rem
```

#### Border Radius

```
radius-sm: 0.25rem, radius-md: 0.375rem, radius-lg: 0.5rem
radius-xl: 0.75rem, radius-2xl: 1rem, radius-full: 9999px
```

#### Shadows

```
shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
shadow-md: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)
shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.06), 0 4px 6px -4px rgba(0,0,0,0.05)
shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05)
```

#### Layout

```
sidebar-width: 256px (16rem)
header-height: 64px
max-width: 1200px
```

### Tailwind Configuration

Criar `frontend/tailwind.config.ts` (Tailwind v4 usa CSS-based config, mas theme pode ser estendido via `@theme`):

```css
/* frontend/src/index.css */
@import "tailwindcss";

@theme {
  --color-beacon-primary: #2563eb;
  --color-beacon-primary-hover: #1d4ed7;
  --color-beacon-primary-50: #eff6ff;
  --color-beacon-primary-100: #dbeafe;
  /* ... todas as cores semânticas ... */
  --color-beacon-success: #16a34a;
  --color-beacon-success-light: #dcfce7;
  /* ... etc ... */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, 'Cascadia Code', monospace;
}
```

---

## Shared UI Components

### Componentes Existentes a Refinar

| # | Componente | Arquivo | Refinamentos Necessários |
|---|-----------|---------|--------------------------|
| C1 | **Button** | `ui/Button.tsx` | Adicionar variante `outline` (borda + hover bg-primary-50), `success` (verde), tamanho `xs`. Ajustar cores para tokens do design system. |
| C2 | **Input** | `ui/Input.tsx` | Adicionar hint text abaixo do campo. Estilo de foco: `ring-3 ring-primary-500/15`. Label com asterisco para required. |
| C3 | **Card** | `ui/Card.tsx` | Adicionar sub-componentes: `Card.Header`, `Card.Body`, `Card.Footer`. Suporte a `padding` variável. |
| C4 | **Badge** | `ui/Badge.tsx` | Adicionar variantes: `critical` (roxo escuro), `high` (vermelho), `medium` (amarelo), `low` (azul), `resolved` (verde com borda), `offline` (cinza). Tamanho base: padding 2px 10px. |
| C5 | **Table** | `ui/Table.tsx` | Headers uppercase tracking-wide text-muted. Row hover bg-surface-hover. Suporte a row destaque (ex: critical row bg). |
| C6 | **Modal** | `ui/Modal.tsx` | Ajustar border-radius para `radius-xl` (0.75rem). Padding consistente. |
| C7 | **Spinner** | `ui/Spinner.tsx` | Manter como está (funcional). |
| C8 | **Select** | `ui/Select.tsx` | Refinar estilo de foco e borda. |
| C9 | **ConfirmDialog** | `ui/ConfirmDialog.tsx` | Manter como está (funcional). |

### Componentes Novos a Criar

| # | Componente | Arquivo | Descrição | Usado Em |
|---|-----------|---------|-----------|----------|
| C10 | **Toggle** | `ui/Toggle.tsx` | Switch enable/disable. 40x22px, animado, focus-visible ring. | Pipelines |
| C11 | **Skeleton** | `ui/Skeleton.tsx` | Loading placeholder com shimmer animation. Variantes: text, heading, card, health-bar. | Dashboard, todas as listas |
| C12 | **EmptyState** | `ui/EmptyState.tsx` | Estado vazio com ícone, título, descrição, e ação opcional. | Dashboard, listas |
| C13 | **ErrorPanel** | `ui/ErrorPanel.tsx` | Mensagem de erro com ícone, texto e botão "Tentar novamente". | Todas as páginas |
| C14 | **StatusDot** | `ui/StatusDot.tsx` | Indicador circular 8x8px. Variantes: online (verde com glow), offline (cinza), warning (amarelo), error (vermelho). | DataSources, Agents, Dashboard |
| C15 | **Breadcrumb** | `ui/Breadcrumb.tsx` | Navegação hierárquica: links + separador "/" + página atual. | DataSource Detail, Anomaly Detail |
| C16 | **Tabs** | `ui/Tabs.tsx` | Tab list com indicador ativo (borda inferior colorida). | Anomalies |
| C17 | **FilterBar** | `ui/FilterBar.tsx` | Barra horizontal com label "Filters" + pills clicáveis + divider. Pill ativo tem bg-primary-50. | DataSources |
| C18 | **SearchInput** | `ui/SearchInput.tsx` | Input de busca com ícone de lupa. 260-280px largura padrão. | DataSources, Agents, Pipelines, Anomalies |
| C19 | **HealthIndicator** | `ui/HealthIndicator.tsx` | Barra de saúde: score "3/5", barra segmentada colorida, legenda. Borda esquerda colorida por estado geral. | Dashboard |
| C20 | **ComparisonBox** | `ui/ComparisonBox.tsx` | Baseline vs Current side-by-side com valor grande, label, seta, diff badge. | Anomaly Detail |
| C21 | **ZScoreDisplay** | `ui/ZScoreDisplay.tsx` | Display de z-score com valor grande mono, label, descrição. Background danger-light. | Anomaly Detail |
| C22 | **Recommendation** | `ui/Recommendation.tsx` | Card de recomendação com ícone, título, texto. Background primary-50. | Anomaly Detail, Anomalies |
| C23 | **CodeBlock** | `ui/CodeBlock.tsx` | Bloco de código JSON com syntax highlighting. Background escuro (#1e1e2e), fonte mono. | Anomaly Detail |

---

## Layout / Shell

### Refinamentos no Shell

O layout shell (Sidebar + Topbar + PageContent) aparece em TODOS os protótipos de páginas autenticadas. Precisa ser refinado para bater com o design:

**Sidebar:**
- Largura fixa: 256px (w-64)
- Brand: ícone "B" azul + texto "Beacon" + border-bottom semi-transparente
- Nav links: 40px altura mínima, gap 4px, radius lg
- Link ativo: bg-sidebar-active (azul), texto branco, font-semibold
- Link hover: bg-sidebar-hover, texto branco
- Ícones: 20x20px area, usar Lucide React
- User section: avatar (32px círculo), nome, botão "Sair"
- **NOVO**: Sidebar badge (contador de notificações) no link de Anomalies

**Topbar:**
- Altura fixa: 64px
- Background: white, border-bottom
- Título da página: text-lg font-semibold
- Actions: botões, search, etc. à direita

**Page Content:**
- Padding: p-6 (24px)
- Overflow-y auto, flex-1

---

## Implementation Plan

### FASE 0: Foundation (Pré-requisito para todas as fases)

**Tasks:**

- [ ] **F0.1** Criar `tailwind.config.ts` com tema customizado (cores, fontes, spacing, radius, shadows) baseado nos tokens dos protótipos
- [ ] **F0.2** Atualizar `index.css` com `@theme` blocks, animações (shimmer, spin), e estilos base
- [ ] **F0.3** Configurar Google Fonts (Inter) no `index.html` com preconnect/preload
- [ ] **F0.4** Refinar componentes UI existentes (C1-C9) para usar novos tokens
- [ ] **F0.5** Criar novos componentes UI (C10-C23) com variantes e estados
- [ ] **F0.6** Testar todos os componentes UI (unit tests com Vitest + Testing Library)
- [ ] **F0.7** Refinar Shell/Sidebar/Header com novo design system
- [ ] **F0.8** Atualizar `api.ts` com novos endpoints necessários (contratos)

### FASE 1: Auth Screens (Públicas, sem shell)

**Task F1 — Login Page (`/login`)**

- [ ] **F1.1** Reimplementar `LoginPage.tsx` seguindo `design-prototypes/login.html`
  - Background: gradiente 135deg neutral-50 → primary-50
  - Card: max-w-[420px], bg-white, rounded-2xl, shadow-xl, p-10
  - Logo "B" (40px, bg-blue-600, shadow) + "Beacon" (text-2xl, bold)
  - Tagline: "Your data's silent guardian..."
  - Campos: Email (com placeholder "you@company.com"), Password ("Enter your password")
  - Row: Checkbox "Remember me" + Link "Forgot your password?" → `/forgot-password`
  - Botão "Sign in" (full width)
  - Footer: "Don't have an account? Contact sales"
- [ ] **F1.2** Estados: Loading (spinner no botão), Error (mensagem acima do form), Disabled
- [ ] **F1.3** Responsivo: @media (max-width: 480px) → padding reduzido, border-radius xl
- [ ] **F1.4** Adicionar link "Forgot your password?" → navega para `/forgot-password`

**Task F2 — Register Page (`/register`)**

- [ ] **F2.1** Reimplementar `RegisterPage.tsx` seguindo `design-prototypes/signup.html`
  - Mesmo layout base do Login (gradiente, card, logo)
  - Subtítulo: "Start monitoring your data quality in under 5 minutes."
  - Campos: Full Name* (Jane Doe), Company (optional), Work Email*, Password* (com hint "At least 8 characters..."), Confirm Password*
  - Password strength indicator: 4 barras + texto (Weak/Medium/Strong)
  - Checkbox: "I agree to Beacon's Terms of Service and Privacy Policy..." com texto sobre privacidade de dados
  - Botão "Create account"
  - Divider "or" + "Google SSO coming soon"
  - Footer: "Already have an account? Sign in" → `/login`
- [ ] **F2.2** Estados: Loading, Error, Password strength (visual)
- [ ] **F2.3** Responsivo

**Task F3 — Reset Password Flow (NOVO — 2 fluxos)**

- [ ] **F3.1** Criar `ForgotPasswordPage.tsx` (Fluxo 1: Request Reset Link) seguindo `design-prototypes/forgot-password.html`
  - Card: "Forgot your password?" + subtítulo
  - Campo: Email address
  - Botão: "Send reset link"
  - **Estado pós-submit:** Success notice (ícone check verde, texto "Check your email", email destacado, "link expires in 15 minutes", timer de reenvio "Resend email · Available in 45s")
  - Footer: "← Back to sign in"
  - Label no topo: "Step 1 — Request Reset"
- [ ] **F3.2** Criar `ResetPasswordPage.tsx` (Fluxo 2: Set New Password, acessado via link do email com token) seguindo mesmo arquivo
  - Card: "Set new password" + "must be different from the previous one"
  - Campos: New password (com hint), Confirm new password
  - Botão: "Reset password"
  - **Estado pós-submit:** Success notice "Password updated" + "Go to sign in →"
  - Info notice: "If you didn't request this change, contact support@beacon.app"
  - Footer: "← Back to sign in"
  - Label no topo: "Step 2 — Set New Password"
- [ ] **F3.3** Rotas: `/forgot-password` → ForgotPasswordPage, `/reset-password?token=xxx` → ResetPasswordPage
- [ ] **F3.4** MSW handlers para `POST /auth/forgot-password` e `POST /auth/reset-password`

**Backend Contracts (FASE 1):**
```
POST /api/v1/auth/forgot-password
  Request: { email: string }
  Response: { data: { message: "If an account exists, a reset link has been sent." } }

POST /api/v1/auth/reset-password
  Request: { token: string, new_password: string }
  Response: { data: { message: "Password reset successfully." } }
```

### FASE 2: Landing Page (Pública, standalone)

**Task F4 — Landing Page (`/` quando não autenticado)**

- [ ] **F4.1** Criar `LandingPage.tsx` em `src/pages/LandingPage.tsx` seguindo `design-prototypes/landing-page.html`
  - Skip link: "Pular para o conteúdo principal"
  - **Header/Nav:** Sticky, backdrop-blur, logo "B" + "Beacon", nav links (Como funciona, Antes vs Depois, Comparação, Para quem), "Entrar" (ghost) + "Criar conta grátis" (primary)
  - **Hero:** Badge "Monitoramento contínuo de dados — agente local", headline "Seus dados estão saudáveis? Descubra antes que alguém perceba." (com gradiente no texto), subtítulo, privacy badge "Sem que seus dados saiam do seu servidor.", CTAs "Criar conta grátis" + "Já tenho conta"
  - **How It Works:** Section "Como funciona", 3 step cards (ícone + número + título + descrição)
  - **Before/After:** Grid 2 colunas com seta. Card "Antes" (danger-light bg, itens com ✗), Card "Depois" (success-light bg, itens com ✓)
  - **Comparison Table:** Tabela com 7 critérios × 4 colunas (Beacon destacado em azul, checks ✓/✗/≈)
  - **Personas:** 3 cards (Data Engineer, Data Analyst, CTO) com avatar, role, pain quote, benefits list
  - **Final CTA:** Background gradiente escuro, headline, CTA branco, privacy note
  - **Footer:** Logo + copyright
- [ ] **F4.2** SEO: `<title>`, `<meta description>`, Open Graph tags no `index.html`
- [ ] **F4.3** Scroll suave (scroll-behavior: smooth) para nav links
- [ ] **F4.4** Roteamento condicional no `App.tsx`: `isAuthenticated ? <DashboardPage /> : <LandingPage />` na rota `/`
- [ ] **F4.5** Responsivo: breakpoints 1024px (hero title menor, steps 1 coluna, personas 1 coluna), 768px (nav hidden, seções compactas), 640px (hero CTAs full-width stack)
- [ ] **F4.6** Reduced motion: `@media (prefers-reduced-motion: reduce)`

### FASE 3: Dashboard + Health Indicator

**Task F5 — Dashboard Page (`/`)**

- [ ] **F5.1** Reimplementar `DashboardPage.tsx` seguindo `design-prototypes/dashboard.html`
  - **Health Indicator:** Score "3/5" grande, barra segmentada colorida (verde/amarelo/cinza), legenda. Borda esquerda colorida (verde/amarelo/vermelho/cinza). Margin-bottom.
  - **Data Source Cards Grid:** Grid `repeat(auto-fill, minmax(280px, 1fr))`. Cada card: nome, tipo, status dot (verde/amarelo/cinza), última verificação, anomalias ativas (0 🟢 / N 🟡/🔴). Card warning tem border-color amarelo, card offline opacidade reduzida.
  - **Activity Feed (Unified):** Card com header "Atividade recente" + "Ver tudo →". Feed items mesclando anomalias + pipeline runs, cada item com ícone (anomaly=! vermelho, pipeline-success=✓ verde, pipeline-error=✗ vermelho), título, descrição, timestamp.
  - **Topbar Actions:** "+ Novo Data Source" button
- [ ] **F5.2** Estados:
  - **Normal (mixed health):** Health indicator amarelo, cards mistos, feed populado
  - **All Healthy (green):** Health indicator verde, todos cards com dot verde, feed "Tudo certo"
  - **Empty (onboarding):** EmptyState com checklist (① Conecte um banco → ② Configure um pipeline → ③ Receba seu primeiro alerta) + CTA "Conectar primeiro banco"
  - **Loading:** Skeleton placeholders (health bar, 3 cards, feed list)
  - **Error parcial:** ErrorPanel por seção com botão "Tentar novamente"
- [ ] **F5.3** React Query: queries independentes para health, cards, feed. staleTime: 30s. refetchInterval: 60s.
- [ ] **F5.4** Navegação: Card click → `/datasources/:id` (detail). Feed item click → `/anomalies/:id` ou `/pipelines/:pipelineId/runs`.
- [ ] **F5.5** Responsivo: 768px (cards 1 coluna), 640px (health score menor)

### FASE 4: Data Sources

**Task F6 — Data Sources List Page (`/datasources`)**

- [ ] **F6.1** Reimplementar `DataSourcesListPage.tsx` seguindo `design-prototypes/datasources.html`
  - **Topbar:** "Data Sources" + SearchInput + "+ Add Data Source" button
  - **Filter Bar:** Label "Filters", filter pills (All Status, Online, Connection Error), divider, type pills (All Types, PostgreSQL, MySQL), divider, sort pills (Date: Newest, Date: Oldest, Name A-Z, Name Z-A)
  - **Table:** Colunas: Name (link), Type (badge), Agent, Status (dot + texto), Last Profiled, Actions (Edit, Config, Remove)
  - **Contador:** "Showing 12 data sources"
- [ ] **F6.2** Filtros funcionais: filtrar por status, tipo, ordenação. Pills ativos têm bg-primary-50.
- [ ] **F6.3** Estados: Loading (skeleton rows), Empty ("No data sources found"), Error
- [ ] **F6.4** Responsivo: 768px (topbar wrap, search full-width)

**Task F7 — Data Source Detail Page (NOVO — `/datasources/:id`)**

- [ ] **F7.1** Criar `DataSourceDetailPage.tsx` seguindo `design-prototypes/datasource-detail.html`
  - **Breadcrumb:** "Data Sources / sales-pipeline"
  - **Page Header:** Nome, status dot + texto, tipo, última verificação. Botão "Editar".
  - **Anomaly Timeline Chart (Left):** Gráfico de barras dos últimos 30 dias. Cada barra colorida por severidade (low/medium/high/critical). Labels: "30 dias atrás", "15 dias atrás", "Hoje". Badge "8 anomalias".
  - **Active Pipelines (Left):** Card com lista de pipelines: nome, descrição, status badge (Success/Warning). Clicável.
  - **Recent Anomalies (Right):** Card com lista de anomalias: severity dot, título, meta, severity badge. Clicável. Link "Ver todas".
  - **Configuration (Right):** Card com grid 2-col: Tipo, Agent, Host (mono), Criado em, Pipelines (count), Último heartbeat (dot + texto)
- [ ] **F7.2** Layout: grid `2fr 1fr` (desktop), 1 coluna (mobile)
- [ ] **F7.3** Estados: Loading (skeleton chart + cards), Error, Empty (sem pipelines, sem anomalias)
- [ ] **F7.4** Responsivo: 1024px (sidebar hidden, layout 1 col)

### FASE 5: Agents

**Task F8 — Agents Page (`/agents`)**

- [ ] **F8.1** Reimplementar `AgentsListPage.tsx` seguindo `design-prototypes/agents.html`
  - **Topbar:** "Agents" + SearchInput + "+ Register New Agent" button
  - **Summary Stats:** "● 8 online  ● 2 offline  Total: 10 agents"
  - **Agent Cards Grid:** `repeat(auto-fill, minmax(340px, 1fr))`
  - **Card (Online):** Header com nome, host (mono), status indicator "Online" (dot verde com glow). Body: stats grid 2x2 (Version, Last heartbeat, Data Sources, Pipelines). Token display (prefix beacon_agent_xxx... + Copy button). Footer: Edit, Manage Tokens, Remove.
  - **Card (Offline):** Opacidade reduzida. Status "Offline" (dot cinza). Warning box: "Agent has not reported in over 48h. Check connectivity or restart the agent process." Footer: Edit, Reconnect, Remove.
- [ ] **F8.2** Estados: Loading (skeleton cards), Empty, Error
- [ ] **F8.3** Token copy: usar `navigator.clipboard.writeText()`. MSW handler para `GET /agents/:id/tokens`.
- [ ] **F8.4** Responsivo: 768px (cards 1 coluna)

### FASE 6: Pipelines

**Task F9 — Pipelines List Page (`/pipelines`)**

- [ ] **F9.1** Criar `PipelinesListPage.tsx` (substituir placeholder) seguindo `design-prototypes/pipelines.html`
  - **Topbar:** "Pipelines" + SearchInput + "Filter" button + "+ New Pipeline" button
  - **Contador:** "47 pipelines across 12 data sources"
  - **Table:** Colunas: Pipeline (nome link), Type (badge: Volume/Null Check/Schema Change/Distribution), Data Source, Schedule (mono tag), Status (badge: Healthy/Warning/Paused), Enabled (Toggle switch), Actions (Edit, Run Now)
  - **Toggle:** Switch funcional para enable/disable pipeline
- [ ] **F9.2** Estados: Loading, Empty, Error
- [ ] **F9.3** Ações: "Run Now" → `POST /pipelines/:id/run`, "Edit" → `/pipelines/:id/edit`
- [ ] **F9.4** Responsivo

**Task F9b — Pipeline Form (NOVO — `/pipelines/new`, `/pipelines/:id/edit`)**

- [ ] **F9b.1** Criar `PipelineForm.tsx` com campos: Name, Type (select), Data Source (select), Schedule (cron input), Config (JSON), Enabled (toggle). Layout consistente com AgentForm/DataSourceForm.
- [ ] **F9b.2** Estados: Create mode, Edit mode (pre-populado), Loading, Error

### FASE 7: Anomalies

**Task F10 — Anomalies List Page (`/anomalies`)**

- [ ] **F10.1** Reimplementar `AnomaliesListPage.tsx` seguindo `design-prototypes/anomalies.html`
  - **Topbar:** "Anomalies" + SearchInput + "Filter by Severity" + "Last 7 days"
  - **Tabs:** All Anomalies | Active (N) | Resolved
  - **Anomaly Detail Inline (Critical):** Panel com header (severity badge, título, meta: Data Source, Pipeline, Detected), Evidence table (Metric, Baseline, Current value, Z-score, Affected rows, Sample null values), Recommendation box (bg-primary-50, texto descritivo com ações recomendadas)
  - **Anomaly List Table:** Colunas: Severity (badge), Description (link), Data Source, Pipeline, Detected, Status (badge), Actions (View, Resolve). Rows críticas com bg diferenciado.
- [ ] **F10.2** Tabs funcionais: filtrar por status (all/active/resolved)
- [ ] **F10.3** Estados: Loading, Empty, Error
- [ ] **F10.4** Ações: "Resolve" → `POST /anomalies/:id/resolve`, "View" → `/anomalies/:id`
- [ ] **F10.5** Sidebar badge: contador de anomalias ativas no link do sidebar
- [ ] **F10.6** Responsivo

**Task F11 — Anomaly Detail Page (`/anomalies/:id`)**

- [ ] **F11.1** Reimplementar `AnomalyDetailPage.tsx` seguindo `design-prototypes/anomaly-detail.html`
  - **Breadcrumb:** "Anomalies / null_check transactions"
  - **Page Header:** Título com severity badge, meta (Detectada há X tempo · ID). Botão "✓ Marcar como Resolvida" (btn--success).
  - **Overview Card (Left):** Tabela detail: Severidade, Tipo, Status (dot + Pending), Detectada em, Resolvida em.
  - **Pipeline Info Card (Right):** Pipeline (link), Data Source (link), Pipeline Run ID, Status da Execução.
  - **Comparison Box (Full):** Baseline vs Current side-by-side com valores grandes, seta, diff badge "+600%".
  - **Z-Score (Full):** Display grande "z=5.2" (mono, danger), label "Desvio extremo", descrição.
  - **Recommendation (Full):** Ícone, título, texto descritivo com ações específicas.
  - **Description (Full):** Texto descritivo da anomalia.
  - **Deviation Details (Full):** CodeBlock com JSON formatado e syntax highlighting.
  - **Alerts Sent (Full):** Tabela: Canal (ícone), Status (badge), Enviado em, Detalhes.
- [ ] **F11.2** Layout: 2 colunas (visão geral + pipeline info), seções full-width abaixo.
- [ ] **F11.3** Estado "Resolvida": badge verde "✓ Resolvida em [data]", botão hidden.
- [ ] **F11.4** Estado 404: EmptyState "Anomalia não encontrada" + link "Voltar para Anomalies"
- [ ] **F11.5** Responsivo: 1024px (sidebar hidden, layout 1 col), 768px (comparison box vertical, z-score vertical)

### FASE 8: Alerts (NOVO)

**Task F12 — Alerts List Page (`/alerts`)**

- [ ] **F12.1** Criar `AlertsListPage.tsx` (substituir placeholder). Design inferido dos protótipos de anomaly-detail (alerts table) e padrão de lista.
  - **Topbar:** "Alerts" + SearchInput + filtros
  - **Table:** Colunas: Anomaly (link), Channel (Email/Slack com ícone), Status (badge: Sent/Failed/Pending), Sent At, Recipient/Channel Name, Actions (View)
- [ ] **F12.2** Estados: Loading, Empty, Error
- [ ] **F12.3** Filtros: por Channel, Status
- [ ] **F12.4** Responsivo

### FASE 9: Polish & Cross-Cutting

- [ ] **F9.1** Verificar fidelidade visual de TODAS as telas contra os protótipos (auditoria visual)
- [ ] **F9.2** Garantir responsividade em todos os breakpoints (testar cada tela em 480px, 640px, 768px, 1024px, 1280px+)
- [ ] **F9.3** Acessibilidade: verificar contraste 4.5:1, keyboard nav, aria-labels, roles, focus management
- [ ] **F9.4** Verificar consistência de textos: todos labels, placeholders, mensagens batem com protótipos
- [ ] **F9.5** SEO: meta tags na landing page, title em todas as páginas
- [ ] **F9.6** Performance: code splitting (lazy loading por feature), otimizar React Query configs
- [ ] **F9.7** Atualizar `App.tsx` com todas as novas rotas
- [ ] **F9.8** Limpar código morto (AnomaliesPlaceholder, PipelinesPlaceholder, AlertsPlaceholder)
- [ ] **F9.9** Atualizar `PROJECT_CONTEXT.md` com novos patterns e aprendizados

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `frontend/tailwind.config.ts` | CREATE | Design tokens theme |
| `frontend/src/index.css` | MODIFY | @theme blocks, animations, base styles |
| `frontend/index.html` | MODIFY | Google Fonts preconnect, SEO meta tags |
| `frontend/src/components/ui/Button.tsx` | MODIFY | New variants (outline, success), size xs, color tokens |
| `frontend/src/components/ui/Input.tsx` | MODIFY | Hint text, required indicator, focus style |
| `frontend/src/components/ui/Card.tsx` | MODIFY | Sub-components (Header, Body, Footer) |
| `frontend/src/components/ui/Badge.tsx` | MODIFY | New variants (critical, high, medium, low, resolved, offline) |
| `frontend/src/components/ui/Table.tsx` | MODIFY | Header styling, row hover, row highlight |
| `frontend/src/components/ui/Modal.tsx` | MODIFY | Border-radius, padding consistency |
| `frontend/src/components/ui/Select.tsx` | MODIFY | Focus/border styling |
| `frontend/src/components/ui/Toggle.tsx` | CREATE | Switch component |
| `frontend/src/components/ui/Skeleton.tsx` | CREATE | Loading placeholders |
| `frontend/src/components/ui/EmptyState.tsx` | CREATE | Empty state component |
| `frontend/src/components/ui/ErrorPanel.tsx` | CREATE | Error state with retry |
| `frontend/src/components/ui/StatusDot.tsx` | CREATE | Status indicator dot |
| `frontend/src/components/ui/Breadcrumb.tsx` | CREATE | Breadcrumb navigation |
| `frontend/src/components/ui/Tabs.tsx` | CREATE | Tab component |
| `frontend/src/components/ui/FilterBar.tsx` | CREATE | Filter bar with pills |
| `frontend/src/components/ui/SearchInput.tsx` | CREATE | Search input |
| `frontend/src/components/ui/HealthIndicator.tsx` | CREATE | Health score bar |
| `frontend/src/components/ui/ComparisonBox.tsx` | CREATE | Baseline vs Current comparison |
| `frontend/src/components/ui/ZScoreDisplay.tsx` | CREATE | Z-score display |
| `frontend/src/components/ui/Recommendation.tsx` | CREATE | Recommendation card |
| `frontend/src/components/ui/CodeBlock.tsx` | CREATE | JSON code display |
| `frontend/src/components/layout/Sidebar.tsx` | MODIFY | Refined design, badge counter |
| `frontend/src/components/layout/Shell.tsx` | MODIFY | Landing page conditional routing |
| `frontend/src/components/layout/Header.tsx` | MODIFY | Topbar refinements |
| `frontend/src/pages/LandingPage.tsx` | CREATE | Full landing page |
| `frontend/src/pages/DashboardPage.tsx` | MODIFY | Full redesign with health, cards, feed |
| `frontend/src/features/auth/LoginPage.tsx` | MODIFY | Full redesign |
| `frontend/src/features/auth/RegisterPage.tsx` | MODIFY | Full redesign |
| `frontend/src/features/auth/ForgotPasswordPage.tsx` | CREATE | Forgot password flow 1 |
| `frontend/src/features/auth/ResetPasswordPage.tsx` | CREATE | Reset password flow 2 |
| `frontend/src/features/datasources/DataSourcesListPage.tsx` | MODIFY | Full redesign with filter bar |
| `frontend/src/features/datasources/DataSourceForm.tsx` | MODIFY | Refinements visuais |
| `frontend/src/features/datasources/DataSourceDetailPage.tsx` | CREATE | Data source detail with chart, pipelines, anomalies |
| `frontend/src/features/agents/AgentsListPage.tsx` | MODIFY | Card grid redesign |
| `frontend/src/features/agents/AgentForm.tsx` | MODIFY | Refinements visuais |
| `frontend/src/features/pipelines/PipelinesListPage.tsx` | CREATE | Replace placeholder |
| `frontend/src/features/pipelines/PipelineForm.tsx` | CREATE | Create/edit pipeline form |
| `frontend/src/features/pipelines/PipelineRunsPage.tsx` | MODIFY | Refinements visuais |
| `frontend/src/features/anomalies/AnomaliesListPage.tsx` | MODIFY | Full redesign with tabs, inline detail |
| `frontend/src/features/anomalies/AnomalyDetailPage.tsx` | MODIFY | Full redesign with comparison, z-score, code block |
| `frontend/src/features/alerts/AlertsListPage.tsx` | CREATE | Replace placeholder |
| `frontend/src/App.tsx` | MODIFY | New routes, conditional landing, lazy loading |
| `frontend/src/lib/api.ts` | MODIFY | New endpoint functions |
| `frontend/src/types/` | MODIFY | New types for contracts |
| `frontend/src/test/mocks/handlers.ts` | MODIFY | New MSW handlers for all endpoints |
| `frontend/src/hooks/useAuth.tsx` | MODIFY | Redirect after login support |

---

## API Contracts (Backend — Documented, Not Implemented)

### Novos Endpoints Necessários

```
POST /api/v1/auth/forgot-password
  Request: { email: string }
  Response: { data: { message: string } }

POST /api/v1/auth/reset-password
  Request: { token: string, new_password: string }
  Response: { data: { message: string } }

GET /api/v1/datasources/:id
  Response: {
    data: {
      id, name, type, agent, host, status,
      created_at, updated_at,
      pipelines_count: number,
      recent_anomalies: Anomaly[],
      anomaly_timeline: { date: string, count: number, severity: string }[]
    }
  }

GET /api/v1/anomalies/:id
  Response: {
    data: {
      id, severity, type, status, description,
      detected_at, resolved_at,
      pipeline_run: { id, status },
      pipeline: { id, name },
      datasource: { id, name },
      deviation_details: JSON,
      baseline_value: number,
      current_value: number,
      z_score: number,
      recommendation: string,
      alerts: Alert[]
    }
  }

GET /api/v1/anomalies/recent?limit=5
  Response: { data: Anomaly[] }  // últimas N anomalias

GET /api/v1/pipeline-runs/recent?limit=5
  Response: { data: PipelineRun[] }  // últimas N execuções

GET /api/v1/datasources/health
  Response: { data: { healthy: number, warning: number, critical: number, offline: number, total: number } }

POST /api/v1/anomalies/:id/resolve
  Response: { data: Anomaly }

POST /api/v1/pipelines/:id/toggle
  Request: { enabled: boolean }
  Response: { data: Pipeline }

GET /api/v1/agents/:id/datasources
  Response: { data: DataSource[] }

GET /api/v1/agents/:id/tokens
  Response: { data: { id, token_prefix, name, last_used_at, created_at }[] }
```

---

## MSW Handlers

Todos os handlers já existem em `frontend/src/test/mocks/handlers.ts` (1040 linhas). As seguintes ações são necessárias:

- [ ] Adicionar handlers para `POST /auth/forgot-password` e `POST /auth/reset-password`
- [ ] Adicionar handler para `GET /datasources/:id` (enriquecido com stats, pipelines_count, recent_anomalies, timeline)
- [ ] Adicionar handler para `GET /datasources/health`
- [ ] Adicionar handler para `GET /anomalies/recent`
- [ ] Adicionar handler para `GET /pipeline-runs/recent`
- [ ] Adicionar handler para `POST /anomalies/:id/resolve`
- [ ] Adicionar handler para `POST /pipelines/:id/toggle`
- [ ] Adicionar handler para `GET /agents/:id/datasources`
- [ ] Adicionar handler para `GET /agents/:id/tokens`
- [ ] Atualizar mock data para incluir dados realistas (anomaly timeline, comparison values, z-scores, recommendations, alerts history)

---

## Component Hierarchy (Frontend)

```
<App>
  <QueryClientProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public — no shell */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={isAuth ? <DashboardPage /> : <LandingPage />} />

          {/* Authenticated — with Shell */}
          <Route element={<Shell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/agents" element={<AgentsListPage />} />
            <Route path="/agents/new" element={<AgentForm />} />
            <Route path="/agents/:id/edit" element={<AgentForm />} />
            <Route path="/datasources" element={<DataSourcesListPage />} />
            <Route path="/datasources/new" element={<DataSourceForm />} />
            <Route path="/datasources/:id" element={<DataSourceDetailPage />} />
            <Route path="/datasources/:id/edit" element={<DataSourceForm />} />
            <Route path="/pipelines" element={<PipelinesListPage />} />
            <Route path="/pipelines/new" element={<PipelineForm />} />
            <Route path="/pipelines/:id/edit" element={<PipelineForm />} />
            <Route path="/pipelines/:pipelineId/runs" element={<PipelineRunsPage />} />
            <Route path="/anomalies" element={<AnomaliesListPage />} />
            <Route path="/anomalies/:id" element={<AnomalyDetailPage />} />
            <Route path="/alerts" element={<AlertsListPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
</App>
```

---

## Testing Strategy

### Unit Tests (Vitest + Testing Library)

- [ ] **Componentes UI (23 arquivos):** Cada componente testado isoladamente com todas variantes e estados
  - Ex: `<Toggle />` testar checked/unchecked, onChange, disabled, focus-visible, aria-label
  - Ex: `<Skeleton />` testar variantes (text, heading, card, health-bar), animação shimmer presente
  - Ex: `<HealthIndicator />` testar score display, barra segmentada com % corretos, cor da borda por estado
- [ ] **Páginas (11 arquivos):** Cada página testada com MSW mock data
  - Testar renderização com dados mockados
  - Testar estados: loading, empty, error, edge cases
  - Testar navegação: links, botões, clicks em cards/rows

### Integration Tests (Vitest + MSW)

- [ ] Fluxo completo de auth: register → login → dashboard → logout
- [ ] Navegação entre telas: dashboard → datasource detail → anomaly detail
- [ ] Filtros funcionais: filtrar data sources, ordenar pipelines, tabs de anomalies
- [ ] Ações: resolve anomaly, toggle pipeline, copy agent token

### E2E Tests (Playwright) — Opcional/Futuro

- [ ] Happy path: landing → register → dashboard → connect first datasource → view anomaly → resolve
- [ ] Reset password flow completo
- [ ] Deep link: email link → anomaly detail → resolve → back to dashboard

### Coverage Target

- Componentes UI: >90%
- Páginas: >80%
- Hooks e lib: >80%

---

## Risks and Considerations

| Risk | Mitigation |
|------|-----------|
| **Escopo grande** — 11 telas, 23 componentes, múltiplos estados por tela | Fases pequenas e independentes. Cada fase entrega valor. Foundation primeiro garante reuso. |
| **Figma rate limit** — Não conseguimos acessar o Figma para validar designs | Os protótipos HTML em `design-prototypes/` são a fonte autoritativa. Foram gerados pelo Figma via html-to-design. |
| **Tailwind v4 breaking changes** — Tailwind v4 usa CSS-based config, não `tailwind.config.ts` tradicional | Usar `@theme` blocks no CSS. Se incompatível, manter tokens como CSS custom properties e referenciar nas classes. |
| **MSW handlers complexos** — Dados mock realistas para gráficos, timelines, comparações | Criar geradores de mock data para evitar duplicação. Usar factories com faker ou dados estáticos bem definidos. |
| **Regressão em telas existentes** — Refazer tudo pode quebrar fluxos que funcionam | Manter testes existentes rodando. Implementar nova versão lado a lado e switch quando pronta. |
| **Performance com muitas queries** — Dashboard com 3+ queries simultâneas | React Query com staleTime adequado. Suspense boundaries para loading granular. |

---

## Dependencies

- **External:** Nenhuma nova dependência necessária. Lucide React já instalado. Tailwind v4, Radix, React Query, React Router já presentes.
- **Internal:**
  - `frontend/src/lib/api.ts` — HTTP client base (precisa de novos métodos)
  - `frontend/src/test/mocks/handlers.ts` — MSW handlers (precisa de novas rotas)
  - `frontend/src/hooks/useAuth.tsx` — Auth context (precisa de redirect support)
  - `frontend/src/types/` — TypeScript types (precisa de novas interfaces)

---

## Implementation Order

1. **FASE 0 (Foundation):** Tokens → Tailwind config → Componentes UI → Shell → API client
2. **FASE 1 (Auth):** Login → Register → Forgot Password → Reset Password
3. **FASE 2 (Landing):** Landing Page completa com todas as seções
4. **FASE 3 (Dashboard):** Health Indicator → DS Cards Grid → Activity Feed → Estados
5. **FASE 4 (Data Sources):** Lista → Form → Detail Page (chart, pipelines, anomalies)
6. **FASE 5 (Agents):** Card grid → Token display → Estados
7. **FASE 6 (Pipelines):** Lista com toggle → Form
8. **FASE 7 (Anomalies):** Lista com tabs → Detail completo
9. **FASE 8 (Alerts):** Lista
10. **FASE 9 (Polish):** Auditoria visual → Responsividade → Acessibilidade → Performance

---

## Evidence (filled by tester/reviewer)

- **Test Log:** `—`
- **Coverage:** `—`
- **Security Scan:** `—`
- **Review Verdict:** `—`

---

*Created by @plan-maker*
*Last updated: 2026-05-21*
