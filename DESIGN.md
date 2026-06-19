# Design Context — Beacon

> **Last Updated:** 2026-06-19 | **Figma:** https://www.figma.com/design/uq30Y3KWwjVleDbBJwmlUz
> **Design System:** Custom (TailwindCSS v4 CSS-based `@theme` tokens)

## 1. Design System Overview

Beacon utiliza um design system customizado construído sobre TailwindCSS v4 com configuração CSS-based via bloco `@theme`. NÃO usa `tailwind.config.ts` — toda a configuração está em `frontend/src/index.css`. Componentes compartilhados em `src/components/ui/` (23 componentes) usam Radix UI primitives (alert-dialog, dialog, select) para acessibilidade e comportamento. Ícones via Lucide React. O design segue WCAG 2.1 AA (contraste 4.5:1, navegação por teclado, suporte a screen reader).

## 2. Color Palette

51 tokens CSS definidos no bloco `@theme` em `frontend/src/index.css`:

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#2563eb` | CTAs, links, elementos ativos |
| `--color-primary-hover` | `#1d4ed7` | Hover de CTAs |
| `--color-primary-light` | `#dbeafe` | Background de badges info |
| `--color-primary-dark` | `#1e40af` | Texto em backgrounds claros |
| `--color-primary-50` | `#eff6ff` | Background sutil |
| `--color-success` | `#16a34a` | Status healthy, confirmações |
| `--color-success-light` | `#dcfce7` | Background de badges success |
| `--color-success-dark` | `#166534` | Texto success |
| `--color-warning` | `#ca8a04` | Status warning |
| `--color-warning-light` | `#fef9c3` | Background de badges warning |
| `--color-warning-dark` | `#854d0e` | Texto warning |
| `--color-danger` | `#dc2626` | Erros, status error |
| `--color-danger-light` | `#fee2e2` | Background de badges danger |
| `--color-danger-dark` | `#991b1b` | Texto danger |
| `--color-critical` | `#7c3aed` | Severidade crítica (anomalias) |
| `--color-critical-light` | `#f5f3ff` | Background de badges critical |

### Surfaces & Text

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#f9fafb` | Background da página |
| `--color-surface` | `#ffffff` | Cards, modais, tabelas |
| `--color-surface-hover` | `#f3f4f6` | Hover de linhas/cards |
| `--color-border` | `#e5e7eb` | Bordas, divisores |
| `--color-border-strong` | `#d1d5db` | Bordas de foco |
| `--color-text-primary` | `#111827` | Texto principal |
| `--color-text-secondary` | `#4b5563` | Texto secundário |
| `--color-text-muted` | `#6b7280` | Placeholders, captions |
| `--color-text-inverse` | `#ffffff` | Texto sobre dark bg |

### Sidebar (Dark Theme)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-sidebar-bg` | `#111827` | Background da sidebar |
| `--color-sidebar-hover` | `#1f2937` | Hover de itens |
| `--color-sidebar-active` | `#2563eb` | Item ativo |
| `--color-offline` | `#9ca3af` | Status offline |

## 3. Typography

- **Primary Font:** Inter (weights 400, 500, 600, 700, 800 — via Google Fonts)
- **Code Font:** ui-monospace, 'Cascadia Code', 'Source Code Pro'

### Scale (Tailwind v4 @theme tokens)

| Scale | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-xs` | 12px (0.75rem) | — | — | Badges, labels pequenos |
| `text-sm` | 14px (0.875rem) | — | — | Captions, tabelas |
| `text-base` | 16px (1rem) | 1.5 | 400 | Corpo |
| `text-lg` | 18px (1.125rem) | — | — | Subtítulos |
| `text-xl` | 20px (1.25rem) | — | 600 | Card titles |
| `text-2xl` | 24px (1.5rem) | 1.3 | 600 | Section headers |
| `text-3xl` | 30px (1.875rem) | 1.2 | 700 | Page titles |

### Line Heights

| Token | Value |
|-------|-------|
| `--leading-tight` | 1.25 |
| `--leading-normal` | 1.5 |
| `--leading-relaxed` | 1.625 |

## 4. Spacing & Layout

TailwindCSS v4 default scale (base 4px). Container max-width não definido globalmente — páginas usam padding responsivo.

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 4px (0.25rem) | Inputs, badges pequenos |
| `--radius-md` | 6px (0.375rem) | Botões, cards |
| `--radius-lg` | 8px (0.5rem) | Modais |
| `--radius-xl` | 12px (0.75rem) | Cards grandes |
| `--radius-2xl` | 16px (1rem) | Containers |
| `--radius-full` | 9999px | Badges circulares, avatares |

### Shadows

| Token | Value |
|-------|-------|
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` |

**Breakpoints:** sm: 640px / md: 768px / lg: 1024px / xl: 1280px (Tailwind defaults)

## 5. Component Patterns

Biblioteca de 23 componentes UI em `frontend/src/components/ui/`:

| Component | Variants | Primitives |
|-----------|----------|------------|
| Button | primary, secondary, ghost, destructive; sm, md, lg; loading | — |
| Badge | success, warning, danger, critical, info, neutral; sm, md | — |
| Input | text, email, password (com toggle), search; error state | — |
| Select | native, com label e error | Radix Select (alguns casos) |
| Modal | default, com onClose callback | Radix Dialog |
| ConfirmDialog | destructive, default | Radix AlertDialog |
| Tabs | horizontal | — |
| Table | compound pattern (Table.Head, Table.Row, Table.Cell) | — |
| Spinner | sm, md, lg; wrapper span + lucide-react Loader2 | — |
| Breadcrumb | links hierárquicos | — |
| FilterBar | compound pattern (FilterBar.Group, FilterBar.Pill) | — |
| SearchInput | com debounce (300ms), Escape para limpar, lupa | — |
| StatusDot | healthy, warning, error, offline | — |
| HealthIndicator | expand/collapse, severity variants | — |
| ComparisonBox | baseline vs atual, delta | — |
| Recommendation | severity-based, expand/collapse | — |
| CodeBlock | code highlight | — |
| ErrorPanel | error state com retry | — |
| EmptyState | ilustração + mensagem + ação | — |
| Skeleton | loading placeholder | — |
| Pagination | page numbers, prev/next | — |
| Header | user menu, notificações | — |
| Sidebar | nav items, collapsed/expanded, anomaly badge | — |
| Shell | layout wrapper (Header + Sidebar + Outlet) | — |

### Button Loading Pattern

```tsx
// Children invisíveis (mantêm espaço no DOM), spinner absoluto
<button className="relative" disabled={loading}>
  <span className={loading ? 'invisible' : ''}>{children}</span>
  {loading && <Loader2 className="absolute inset-0 m-auto animate-spin" />}
</button>
```

### Table Compound Pattern

```tsx
<Table>
  <Table.Head>
    <Table.Row>
      <Table.Cell header>Column</Table.Cell>
    </Table.Row>
  </Table.Head>
  <Table.Body>
    <Table.Row>
      <Table.Cell>Data</Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
```

## 6. Motion

- Default: `150ms ease-in-out`
- Respeita `prefers-reduced-motion`

## 7. Figma File Map

| Page | Content | Key Node IDs |
|------|---------|--------------|
| Dashboard | Cards + anomaly feed + pipeline runs feed | `node-id=...` |
| Agents | List + form | `node-id=...` |
| Data Sources | List + detail + form | `node-id=...` |
| Pipelines | List + form + runs | `node-id=...` |
| Anomalies | List + detail | `node-id=...` |
| Auth | Login + Register + Forgot/Reset Password | `node-id=...` |
| Landing | Homepage pública | `node-id=...` |

> 11 protótipos HTML em `.opencode/work/design-prototypes/` para referência.

## 8. Assets

- **Icons:** Lucide React (https://lucide.dev)
- **Images:** WebP com lazy-load
- **Favicon:** beacon favicon em `frontend/public/`

---

*Generated by context-generator on 2026-06-19*
