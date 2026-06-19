# Task: hotfix-auth-validation — HOTFIX: Auth token validation on startup + error handling

## Status: READY_TO_COMMIT

## Metadata

- **Type:** bug
- **Scope:** full-stack
- **Priority:** high
- **Source:** Direct report
- **Mode:** HOTFIX

## Problem Statement

Two related bugs:
1. Ao acessar localhost, usuario vai direto pra dashboard ao inves da landing page — porque `isAuthenticated` confia cegamente no localStorage sem validar tokens com servidor
2. Na dashboard aparecem mensagens "Invalid or expired token" — porque os 4 queries disparam com token expirado, refresh tambem falha, e erros sao exibidos crus

## Root Cause

`useAuth.tsx` inicializa `tokens` e `user` do localStorage sem NENHUMA validacao server-side. `isAuthenticated = !!tokens && !!user` retorna true mesmo com tokens expirados. O `HomePage` entao redireciona para `/dashboard`, onde queries disparam com token invalido.

## Impact

- **Users affected:** Qualquer usuario com sessao expirada
- **Business impact:** Landing page inacessivel, usuarios veem erros tecnicos na UI
- **Started:** Imediato

## Acceptance Criteria

- [ ] Usuario sem sessao valida ve landing page (nao dashboard)
- [ ] Tokens expirados sao limpos automaticamente
- [ ] Mensagens "Invalid or expired token" nao aparecem na UI
- [ ] Sessao expirada redireciona para /login

## Technical Approach

**Decision:** Adicionar validacao server-side no startup + limpeza automatica de tokens em 401

### Backend
- Adicionar `GET /auth/me` que retorna user info usando `require_auth`

### Frontend
- `useAuth.tsx`: Adicionar `verifyAuth()` chamado no mount, que bate `/auth/me`
- `api.ts`: Em 401 irrecuperavel, limpar tokens e disparar evento de logout
- `App.tsx`: Aguardar verificacao antes de decidir landing vs dashboard
- `DashboardPage.tsx`: Tratar erro de autenticacao com redirect ao inves de ErrorPanel

## Implementation Plan

### Tasks

- [ ] Adicionar GET /auth/me no backend
- [ ] Corrigir useAuth.tsx com verificacao no mount
- [ ] Corrigir api.ts com cleanup automatico em 401
- [ ] Corrigir App.tsx para aguardar verificacao
- [ ] Corrigir DashboardPage.tsx para tratar erro de sessao

### Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| app/presentation/api/routes/auth.py | modify | Add GET /auth/me endpoint |
| frontend/src/hooks/useAuth.tsx | modify | Add token verification on mount |
| frontend/src/lib/api.ts | modify | Clear tokens on unrecoverable 401 |
| frontend/src/App.tsx | modify | Wait for verification before routing |
| frontend/src/pages/DashboardPage.tsx | modify | Handle auth errors gracefully |

## Rollback Plan

Reverter commits do hotfix branch. Nao ha migracoes de banco.

## Testing Strategy

- **Unit tests:** Verificar comportamento do useAuth com token valido/invalido
- **Integration tests:** Fluxo completo: localStorage com token expirado → landing page
- **E2E tests:** Smoke test critical paths

---

_Hotfix mode activated at 2026-06-11_
_Created by @hotfix_
