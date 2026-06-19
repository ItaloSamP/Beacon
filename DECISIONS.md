# Architecture Decisions — Beacon

> ADR log. Append new decisions at the bottom.
> **Last Updated:** 2026-06-19

---

## ADR-001: Hybrid Architecture (Agent Local + Cloud Dashboard)

**Date:** 2026-05-10 | **Status:** Accepted

### Context
Beacon precisa monitorar dados que residem na infraestrutura do cliente (bancos PostgreSQL, etc.). Enviar dados crus para a nuvem violaria requisitos de privacidade/segurança. Um SaaS puro não é viável.

### Decision
Arquitetura híbrida com dois componentes:
- **Agente local** (Python) roda na infra do cliente, faz profiling estatístico e detecção de anomalias próximo aos dados
- **Cloud dashboard** (FastAPI + React) centraliza gestão, histórico e disparo de alertas

O agente **nunca sobe dados crus** — apenas resumos estatísticos e metadados de schema.

### Rationale
- Privacidade: dados sensíveis nunca saem da infra do cliente
- Latência: detecção local é mais rápida que round-trip cloud
- Resiliência: agente funciona offline (fila local SQLite)
- Simplicidade operacional: 2 componentes vs N microservices

### Trade-offs
- ✅ Privacidade garantida (dados crus nunca saem do cliente)
- ✅ Resiliência offline (fila local SQLite)
- ⚠️ Complexidade de deploy (cliente precisa instalar agente)
- ⚠️ Dois codebases para manter (cloud + agente)

### Alternatives Considered
- **SaaS puro (cloud-only):** Rejeitado — exigiria envio de dados crus, quebra de privacidade
- **On-premise completo:** Rejeitado — cliente perderia dashboard centralizado, updates, gestão multi-agente
- **SSH tunneling:** Rejeitado — complexidade operacional alta, não escala

---

## ADR-002: Cloud Backend como Modular Monolith

**Date:** 2026-05-10 | **Status:** Accepted

### Context
O backend cloud tem domínios bem definidos (conectores, pipelines, alertas, dashboard) que evoluem em velocidades diferentes. A escolha entre microservices e monolith impacta deploy, complexidade e velocidade inicial.

### Decision
Modular Monolith — deploy único com módulos internos isolados:
- `domain/` — entidades e regras de negócio puras
- `application/` — serviços e casos de uso
- `infrastructure/` — repositórios, conectores externos
- `presentation/` — rotas FastAPI, controllers REST

Facilita futura extração para serviços independentes se necessário.

### Rationale
- Estágio inicial não justifica complexidade operacional de microservices
- Módulos internos bem isolados permitem extração futura sem rewrite
- Deploy único simplifica CI/CD e desenvolvimento local
- Feature-based organization no frontend segue o mesmo princípio

### Trade-offs
- ✅ Deploy simples (um serviço)
- ✅ Extração futura facilitada (módulos isolados)
- ⚠️ Acoplamento em runtime (mesmo processo)
- ⚠️ Escala vertical limitada (single process)

### Alternatives Considered
- **Microservices desde o início:** Rejeitado — overengineering para estágio inicial, complexidade de orquestração, latência de rede entre serviços
- **Monolith tradicional (sem módulos):** Rejeitado — acoplamento forte dificulta evolução e extração futura

---

## ADR-003: Fernet Symmetric Encryption para Connection Config

**Date:** 2026-05-12 | **Status:** Accepted

### Context
`DataSource.connection_config` (JSONB column) armazena credenciais de banco de dados (host, porta, usuário, senha). Sprint 0 armazenava em plain text (risco documentado). Sprint 1+ exige criptografia at rest.

### Decision
Fernet (symmetric encryption via `cryptography` library) para criptografar `connection_config`:
- Chave: `FERNET_KEY` env var (32-byte URL-safe base64)
- Formato: `{"_encrypted": "<base64_encrypted_json>"}`
- Fallback: se `FERNET_KEY` vazio (dev/test), armazena em plain text
- Descriptografado apenas em: detail view + agent self-config

### Rationale
- Simétrico = mesmo agente/dashboard que encripta também desencripta
- Fernet é parte da biblioteca `cryptography` (bem estabelecida)
- Fallback para dev/test simplifica desenvolvimento local
- Não requer KMS externo (complexidade desnecessária no estágio atual)

### Trade-offs
- ✅ Simples (uma chave, uma lib)
- ✅ Dev-friendly (fallback plain text quando chave vazia)
- ⚠️ Chave simétrica — comprometimento da chave = comprometimento de todos os dados
- ⚠️ Rotação de chave não implementada (futuro)

### Alternatives Considered
- **AWS KMS / cloud KMS:** Rejeitado — complexidade excessiva para estágio inicial, vendor lock-in, não funciona em dev local
- **Asymmetric (RSA):** Rejeitado — complexidade desnecessária (não há cenário onde encriptador ≠ desencriptador)
- **Column-level PostgreSQL encryption:** Rejeitado — requer extensões PostgreSQL específicas, menos portável

---

## ADR-004: Agent Token Auth Pattern (one-time reveal + prefix-only listing + SHA-256 hash)

**Date:** 2026-05-14 | **Status:** Accepted

### Context
Agentes locais precisam autenticar chamadas à API cloud (heartbeat, self-config, upload de anomalias). Tokens devem ser seguros, revogáveis e rastreáveis, seguindo o mesmo padrão de API Keys.

### Decision
Agent tokens seguem o mesmo modelo de segurança de API Keys:
- **Formato:** `beacon_agent_` prefix + 48 chars aleatórios (`secrets.token_urlsafe(36)`)
- **Storage:** SHA-256 hash no banco, prefix visível para identificação
- **Reveal:** Token completo retornado UMA ÚNICA VEZ no `POST /agents` (criação)
- **Listing:** `GET /agents/{id}/tokens` mostra apenas prefix, nome, last_used_at
- **Revoke:** Hard delete do registro
- **Auth middleware:** Terceiro método na cadeia (API Key → JWT → Agent Token)

### Rationale
- Consistência com o padrão de API Keys (mesmo modelo mental)
- SHA-256 irreversível — mesmo com acesso ao banco, tokens não são recuperáveis
- Prefix-only listing evita vazamento acidental em logs/responses
- Middleware unificado (`require_auth`) lida com 3 métodos em prioridade

### Trade-offs
- ✅ Consistente com API Keys
- ✅ Token real nunca armazenado (apenas hash)
- ✅ Revogação simples (hard delete)
- ⚠️ Token perdido = precisa gerar novo (sem recuperação)
- ⚠️ `last_used_at` inicialmente não atualizado no middleware (corrigido no Sprint 2)

### Alternatives Considered
- **JWT para agentes:** Rejeitado — JWT expira, requer refresh, complexidade desnecessária para agents (que já têm token fixo)
- **mTLS:** Rejeitado — complexidade de PKI, difícil para clientes não-técnicos

---

## ADR-005: Docker Shared Volume Pattern para Agent Token Provisioning

**Date:** 2026-05-17 | **Status:** Accepted

### Context
O agente Docker service precisa de um token de autenticação que só o backend pode gerar. Backend e agente são containers separados com ciclos de vida independentes. É necessário um mecanismo de passagem de token sem race conditions.

### Decision
Volume nomeado `beacon_token` montado em `/run/beacon`:
- **Backend** (rw): entrypoint gera token via API → escreve em `/run/beacon/agent_token`
- **Agent** (ro): entrypoint faz polling (`while [ ! -f /run/beacon/agent_token ]; do sleep 2; done`) → lê token
- Agent depende de backend com `condition: service_started` (não `service_healthy`) para evitar deadlock

### Rationale
- Sem race condition: agente espera ativamente o token existir
- Independência de ciclo de vida: containers podem reiniciar separadamente
- Read-only no agente: segurança (agente não pode sobrescrever token)
- `service_started` evita deadlock circular (backend não precisa estar healthy)

### Trade-offs
- ✅ Sem race condition (polling explícito)
- ✅ Seguro (agent monta volume como read-only)
- ✅ Backend/agent podem reiniciar independentemente
- ⚠️ Polling não é ideal (preferível um mecanismo de notificação)
- ⚠️ Token em filesystem (aceitável para dev, rever para produção)

### Alternatives Considered
- **Environment variable pass-through:** Rejeitado — Docker Compose não permite passar output de um container como env var de outro
- **API call do agent ao backend:** Rejeitado — agente precisa de token para autenticar, deadlock (precisa de token para pegar token)
- **Docker secrets:** Rejeitado — apenas disponível em Docker Swarm, não no Compose standalone

---

## ADR-006: Codecov com 3 Flags Independentes

**Date:** 2026-06-19 | **Status:** Accepted

### Context
O projeto tem 3 componentes com stacks de teste diferentes (backend Python/pytest, frontend TypeScript/Vitest, agent Python/pytest). A cobertura agregada distorce a realidade — um componente com 95% esconde outro com 50%.

### Decision
Codecov configurado com 3 flags independentes:
- `backend` (app/): target 80%
- `frontend` (frontend/src/): target 80%
- `agent` (agent/): target 80%

Cada CI workflow faz upload com sua flag. Codecov reporta separadamente por flag e combinado. `carryforward` habilitado para evitar falhas quando um componente não tem alterações.

### Rationale
- Visibilidade granular: problema de cobertura é atribuído ao componente correto
- Target realista: 80% por componente (vs 80% global que era distorcido por type-only files)
- CI não bloqueia componentes não afetados (carryforward)
- Patch coverage: 80% target para código novo/alterado

### Trade-offs
- ✅ Visibilidade por componente
- ✅ CI independente (frontend não bloqueia backend)
- ✅ Patch coverage incentiva testes em código novo
- ⚠️ 3 uploads separados (complexidade marginal de CI)

### Alternatives Considered
- **Coverage global único (como Sprint 0):** Rejeitado — agregação escondia baixa cobertura em componentes específicos
- **Coveralls:** Rejeitado — Codecov já integrado, melhor suporte a flags e carryforward

---

*Generated by context-generator on 2026-06-19*
