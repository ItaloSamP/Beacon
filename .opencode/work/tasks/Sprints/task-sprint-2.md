# Task: task-sprint-2 — Sprint 2: Confiabilidade & Regras de Alerta

## Status: PLANNING

## Metadata
- **Type:** feature
- **Scope:** full-stack
- **Priority:** high
- **Source:** Prompt — Sprint 2 planning (user-confirmed, 2026-06-02)

---

## Problem Statement

A Sprint 1 entregou o core loop funcional (agente → profiling → detecção → upload → alerta), mas deixou 3 buracos que impedem o produto de entregar valor real:

1. **Email não sai.** `EmailNotifier` é um stub — só loga, nunca chama SendGrid. Alerta fica salvo no banco mas ninguém recebe nada.
2. **7 findings de segurança abertos.** User isolation ausente, bare `except Exception`, `last_used_at` nunca atualizado, endpoints sem restrição de agent-token.
3. **AlertRules existem no modelo mas têm zero implementação.** O modelo `AlertRule` está definido no ORM, mas não tem repositório, serviço, schemas ou rotas. `AlertDispatcher` ignora completamente as regras — toda anomalia gera alerta, sem filtro de severidade.

A Sprint 2 resolve esses 3 buracos. **Sem expandir conectores, sem Slack, sem métodos estatísticos novos.** Só o que já devia funcionar.

---

## Acceptance Criteria

1. **Email real:** Anomalia detectada → email chega na caixa de entrada via SendGrid, com assunto, corpo em HTML e evidências (tabela, baseline, z-score, recomendação).
2. **7 security fixes aplicados:** todos os findings MEDIUM da Sprint 1 resolvidos e verificados.
3. **AlertRules CRUD completo:** criar, listar, editar e deletar regras de alerta via API (backend) e via formulário inline no Pipeline (frontend).
4. **AlertDispatcher usa regras:** só dispara alerta se a anomalia atende aos thresholds configurados nas AlertRules do pipeline.
5. **Tudo testado:** ≥80% coverage no código novo, testes de integração para email + alert rules, zero regressões nos testes existentes.

---

## Technical Approach

**Decision:** 3 frentes independentes com ordem de dependência: segurança primeiro (não quebra nada, arruma o que já existe), depois SendGrid (dependência do AlertDispatcher real), depois AlertRules (usa o AlertDispatcher já funcional com email).

**Origin:** user-driven — 3 decisões confirmadas (2026-06-02)

**Rationale:** 
- Segurança é pré-requisito: user isolation nos repositórios afeta como AlertRules são consultadas depois.
- SendGrid é pré-requisito: AlertDispatcher precisa enviar email de verdade antes de fazermos ele obedecer regras.
- AlertRules por último: quando chegar lá, email já funciona e a segurança já isola por usuário — só adicionar a lógica de regras.

### Decisões técnicas confirmadas:

| Decisão | Escolha |
|---------|---------|
| SendGrid | SDK oficial (`sendgrid` package) |
| AlertRule.condition | Campos estruturados: `metric`, `operator`, `threshold` |
| AlertRules no frontend | Seção inline dentro do formulário de criação/edição do Pipeline |
| Ordem de implementação | Segurança → SendGrid → AlertRules |

---

## Architecture Fit

### O que NÃO muda
- Arquitetura híbrida (agent + cloud) permanece igual
- Modular Monolith no backend — sem novos serviços
- Feature-based organization no frontend
- API conventions (ApiResponse/PaginatedApiResponse), auth middleware, padrão de repositórios

### O que muda

**Modelo AlertRule — de string para estruturado:**

Antes:
```python
condition = Column(String(500))  # "z_score > 3"
```

Depois:
```python
metric = Column(String(50))      # "z_score" | "null_pct" | "volume_delta"
operator = Column(String(10))    # "gt" | "lt" | "gte" | "lte" | "eq"
threshold = Column(Float)        # 3.0
```

**AlertDispatcher — de stub para funcional:**

Antes: criava Alert no banco, não chamava notifier, ignorava alert_rules.
Depois: recebe anomaly + pipeline_id → consulta AlertRules do pipeline → filtra por threshold → chama EmailNotifier.send_alert() para cada regra ativa.

**Rotas novas:**

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/v1/pipelines/{id}/rules` | Listar regras do pipeline |
| `POST` | `/api/v1/pipelines/{id}/rules` | Criar regra |
| `PUT` | `/api/v1/pipelines/{id}/rules/{rule_id}` | Editar regra |
| `DELETE` | `/api/v1/pipelines/{id}/rules/{rule_id}` | Deletar regra |

---

## Implementation Plan

### Phase 1: Security Fixes (backend)

- [ ] **M-1:** Atualizar `last_used_at` no middleware de auth quando autentica via agent token
- [ ] **M-2:** Substituir `except Exception` por `except (InvalidToken, ValueError, json.JSONDecodeError)` em `datasource_service.py:_decrypt_config_fields()`
- [ ] **M-7:** Substituir `except Exception` por `except (NotFoundException, SQLAlchemyError)` em `pipeline_runner.py:_execute_pipeline()`
- [ ] **M-3:** Adicionar verificação de user ownership no DataSource detail — só retorna config descriptografada se o usuário é dono do agent vinculado
- [ ] **M-4:** Restringir `POST /api/v1/anomalies` para aceitar apenas `auth_method == "agent_token"`
- [ ] **M-5a:** User isolation em anomalies — repository filtra por `user_id` (via pipeline → datasource → agent)
- [ ] **M-5b:** User isolation em pipeline runs — repository filtra por `user_id`
- [ ] **M-5c:** User isolation em alerts — repository filtra por `user_id`
- [ ] **M-8:** Fazer AlertDispatcher usar `alert_rules` para filtrar por threshold de severidade (concluído no Phase 3)

### Phase 2: SendGrid Email (backend)

- [ ] Adicionar `sendgrid` ao `pyproject.toml`
- [ ] Implementar `EmailNotifier.send_alert()` com SDK do SendGrid — template HTML, subject, evidências
- [ ] Adicionar `SENDGRID_API_KEY` validation no startup
- [ ] Atualizar `AlertDispatcher.dispatch()` para chamar `self.notifier.send_alert()` de fato
- [ ] Template de email: "Anomalia detectada: {tipo} em {tabela}" + tabela comparativa (baseline vs atual) + z-score + recomendação
- [ ] Testes unitários para EmailNotifier com mock do SendGrid SDK
- [ ] Testes de integração para fluxo completo: anomaly → dispatch → email

### Phase 3: AlertRules Backend

- [ ] Migration: dropar coluna `condition`, adicionar `metric`, `operator`, `threshold` na tabela `alert_rules`
- [ ] Atualizar modelo `AlertRule` no `models.py`
- [ ] Criar schemas Pydantic: `AlertRuleCreate`, `AlertRuleUpdate`, `AlertRuleResponse`
- [ ] Criar `AlertRuleRepository` (CRUD + list_by_pipeline)
- [ ] Criar `AlertRuleService` (CRUD + validações de métrica/operador)
- [ ] Criar rotas em `app/presentation/api/routes/alert_rules.py`
- [ ] Registrar rotas em `router.py`
- [ ] Atualizar `AlertDispatcher.dispatch()` para:
  - Receber `pipeline_id` (não só anomaly)
  - Consultar AlertRules do pipeline via repositório
  - Filtrar anomalia por severity threshold das regras
  - Só disparar email se a severidade da anomalia >= threshold da regra
- [ ] Atualizar `pipeline_runner.py` para passar `pipeline_id` ao AlertDispatcher
- [ ] Atualizar `anomaly_service.py` para passar `pipeline_id` ao AlertDispatcher
- [ ] Testes unitários para AlertRuleService, AlertDispatcher com regras
- [ ] Testes de integração para CRUD de AlertRules

### Phase 4: AlertRules Frontend

- [ ] Criar types em `frontend/src/types/alert.ts`: `AlertRule`, `AlertRuleCreate`, métricas e operadores como union types
- [ ] Criar componente `AlertRulesSection.tsx` — lista de regras inline + formulário de adicionar
- [ ] Integrar `AlertRulesSection` no `PipelineForm.tsx` (criação e edição)
- [ ] Adicionar chamadas API em `lib/api.ts` para CRUD de alert rules
- [ ] Testes de componente para AlertRulesSection
- [ ] Atualizar testes do PipelineForm para cobrir a nova seção

### Phase 5: Verification & Polish

- [ ] Rodar test suite completa (backend unit + frontend vitest)
- [ ] Rodar Bandit security scan
- [ ] Rodar Ruff lint
- [ ] Verificar coverage ≥80% no código novo
- [ ] Teste manual: criar pipeline com regra, disparar run, verificar email na caixa de entrada
- [ ] Atualizar CHANGELOG / documentação se necessário

---

## Files to Create/Modify

### Backend — Modify

| File | Action | Purpose |
|------|--------|---------|
| `app/presentation/api/middleware/auth.py` | MODIFY | M-1: `last_used_at` update |
| `app/application/datasource_service.py` | MODIFY | M-2: specific exceptions; M-3: user ownership check |
| `app/application/pipeline_runner.py` | MODIFY | M-7: specific exceptions; M-8: wire alert_rules |
| `app/presentation/api/routes/anomalies.py` | MODIFY | M-4: agent-token restriction |
| `app/presentation/api/routes/datasources.py` | MODIFY | M-3: pass user_id to service |
| `app/application/anomaly_service.py` | MODIFY | M-5a: user isolation; wire alert_rules |
| `app/infrastructure/repositories/anomaly_repo.py` | MODIFY | M-5a: user_id filter |
| `app/infrastructure/repositories/pipeline_run_repo.py` | MODIFY | M-5b: user_id filter |
| `app/infrastructure/repositories/alert_repo.py` | MODIFY | M-5c: user_id filter |
| `app/infrastructure/notifiers/email.py` | MODIFY | SendGrid SDK integration |
| `app/application/alert_dispatcher.py` | MODIFY | Real dispatch + alert_rules filtering |
| `app/domain/models.py` | MODIFY | AlertRule: condition → metric/operator/threshold |
| `app/domain/schemas.py` | MODIFY | AlertRuleCreate, AlertRuleUpdate schemas |
| `app/presentation/api/router.py` | MODIFY | Register alert_rules router |
| `app/shared/config.py` | MODIFY | SendGrid config validation |
| `pyproject.toml` | MODIFY | Add `sendgrid` dependency |

### Backend — Create

| File | Action | Purpose |
|------|--------|---------|
| `app/infrastructure/repositories/alert_rule_repo.py` | CREATE | AlertRule CRUD repository |
| `app/application/alert_rule_service.py` | CREATE | AlertRule business logic |
| `app/presentation/api/routes/alert_rules.py` | CREATE | AlertRule REST endpoints |
| `alembic/versions/xxxx_refactor_alert_rules.py` | CREATE | Migration |

### Frontend — Modify

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/types/alert.ts` | MODIFY | Add AlertRule types |
| `frontend/src/features/pipelines/PipelineForm.tsx` | MODIFY | Add AlertRulesSection |
| `frontend/src/lib/api.ts` | MODIFY | Add AlertRule API calls |

### Frontend — Create

| File | Action | Purpose |
|------|--------|---------|
| `frontend/src/features/pipelines/AlertRulesSection.tsx` | CREATE | Inline AlertRules CRUD UI |

### Test Files — Create

| File | Action | Purpose |
|------|--------|---------|
| `tests/application/test_alert_rule_service.py` | CREATE | AlertRuleService unit tests |
| `tests/infrastructure/test_email_notifier.py` | CREATE | EmailNotifier unit tests |
| `tests/presentation/routes/test_alert_rules.py` | CREATE | AlertRules API integration tests |
| `frontend/src/features/pipelines/__tests__/AlertRulesSection.test.tsx` | CREATE | AlertRulesSection component tests |

---

## Implementation Order

1. **Phase 1 (Security):** Fixes não dependem de nada — podem ser o primeiro commit. Cada fix é atômico e testável isoladamente.
2. **Phase 2 (SendGrid):** Depende do `pyproject.toml` ter a dependência nova. Roda independente dos fixes de segurança.
3. **Phase 3 (AlertRules Backend):** Depende de Phase 2 concluído (AlertDispatcher precisa do EmailNotifier real). Também depende dos fixes M-5 (user isolation nos repositórios) para filtrar regras por usuário.
4. **Phase 4 (AlertRules Frontend):** Depende de Phase 3 (rotas da API existirem).
5. **Phase 5 (Verification):** Depende de tudo anterior.

---

## API Contracts

### AlertRule Endpoints

**POST /api/v1/pipelines/{pipeline_id}/rules**
```json
// Request
{
  "metric": "z_score",
  "operator": "gt",
  "threshold": 3.0,
  "channels": ["email"],
  "enabled": true
}
// Response 201
{
  "data": {
    "id": "uuid",
    "pipeline_id": "uuid",
    "metric": "z_score",
    "operator": "gt",
    "threshold": 3.0,
    "channels": ["email"],
    "enabled": true,
    "created_at": "2026-06-02T00:00:00Z",
    "updated_at": "2026-06-02T00:00:00Z"
  },
  "error": null
}
```

**GET /api/v1/pipelines/{pipeline_id}/rules**
```json
// Response 200
{
  "data": [ /* Array de AlertRuleResponse */ ],
  "meta": { "total": 2 },
  "error": null
}
```

**PUT /api/v1/pipelines/{pipeline_id}/rules/{rule_id}**
```json
// Request (todos os campos opcionais)
{
  "threshold": 2.5,
  "enabled": false
}
```

**DELETE /api/v1/pipelines/{pipeline_id}/rules/{rule_id}**
→ 204 No Content

### AlertRule Fields (estruturados)

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `metric` | string enum | `z_score`, `null_pct`, `volume_delta_pct` | Qual métrica monitorar |
| `operator` | string enum | `gt` (>), `lt` (<), `gte` (≥), `lte` (≤), `eq` (=) | Comparação |
| `threshold` | float | ex: 3.0, 0.1, -50.0 | Valor de corte |
| `channels` | list[string] | `["email"]` (slack futuro) | Canais de notificação |
| `enabled` | bool | true/false | Regra ativa? |

---

## Database Changes

### Migration: Refactor `alert_rules`

```sql
-- Remove coluna antiga
ALTER TABLE alert_rules DROP COLUMN condition;

-- Adiciona colunas estruturadas
ALTER TABLE alert_rules ADD COLUMN metric VARCHAR(50) NOT NULL DEFAULT 'z_score';
ALTER TABLE alert_rules ADD COLUMN operator VARCHAR(10) NOT NULL DEFAULT 'gt';
ALTER TABLE alert_rules ADD COLUMN threshold FLOAT NOT NULL DEFAULT 3.0;

-- Mantém: id, pipeline_id, channels (JSONB), enabled, created_at, updated_at
```

**Rollback:**
```sql
ALTER TABLE alert_rules ADD COLUMN condition VARCHAR(500);
ALTER TABLE alert_rules DROP COLUMN metric;
ALTER TABLE alert_rules DROP COLUMN operator;
ALTER TABLE alert_rules DROP COLUMN threshold;
```

---

## Testing Strategy

### Unit Tests (Backend — Pytest)
- **AlertRuleService:** CRUD, validação de métrica inválida, operador inválido
- **EmailNotifier:** mock do SendGrid SDK, verifica chamada com subject/to/content corretos, trata API key ausente, trata erro de rede
- **AlertDispatcher:** com regras (dispara), sem regras (não dispara), threshold não atingido (não dispara), múltiplas regras (dispara uma vez por regra)
- **Security fixes:** testa `last_used_at` atualizado, testa exceções específicas, testa bloqueio de acesso cross-user

### Integration Tests (Backend — Pytest)
- **AlertRules CRUD:** POST → GET → PUT → DELETE cycle completo
- **Pipeline + Rules:** criar pipeline, adicionar regras, listar regras do pipeline, deletar pipeline (CASCADE nas regras)
- **Email fluxo:** mock do SendGrid HTTP, anomaly → dispatch → verifica email enviado

### Unit Tests (Frontend — Vitest)
- **AlertRulesSection:** renderiza regras existentes, adiciona nova regra, edita threshold, deleta regra, validações de formulário
- **PipelineForm:** integração com AlertRulesSection (renderiza seção na criação e edição)

---

## Risks and Considerations

| Risco | Mitigação |
|-------|-----------|
| **Migration em tabela vazia** — `alert_rules` nunca foi usada, então o DROP COLUMN + ADD COLUMN não perde dados. Se houver dados de seed, migrar antes. | Verificar `alembic/versions/` se há seed data com `condition`. |
| **SendGrid SDK quebra testes** — mockar `sendgrid.SendAPIClient` nos testes para não depender de rede. | Usar `unittest.mock.patch` no `EmailNotifier.__init__`. |
| **User isolation quebra queries existentes** — repositórios de anomalies, pipeline_runs e alerts hoje não filtram por user_id. Adicionar JOINs pode impactar performance. | Adicionar índices nas FKs usadas nos JOINs. Testar com `EXPLAIN ANALYZE`. |
| **PipelineForm fica complexo** — adicionar AlertRulesSection inline aumenta o tamanho do formulário. | Componentizar bem, manter AlertRulesSection como componente independente com sua própria lógica de estado. |
| **AlertDispatcher dupla notificação** — se pipeline_runner e anomaly_service ambos chamam dispatch, pode enviar email duplicado. | Centralizar dispatch em UM ponto: `pipeline_runner._execute_pipeline()` ou `anomaly_service.process_anomaly()`. Preferir o pipeline_runner (único caller de produção). |

---

## Dependencies

- **External:** `sendgrid` (SendGrid Python SDK) — adicionar ao `pyproject.toml`
- **Internal:** Nenhuma nova dependência interna. Todos os módulos já existem.

---

## Evidence (filled by tester/reviewer)

- **Test Log:** _— filled after testing_
- **Coverage:** _— filled after testing_
- **Security Scan:** _— filled after review_
- **Review Verdict:** _— filled after review_

---

*Created by @plan-maker*
*Last updated: 2026-06-02T00:00:00Z*
