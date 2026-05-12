# Project Brief — Beacon

> **Status:** Rascunho | **Data:** 2026-05-12 | **Autor:** Product Discovery Session

---

## 1. Visao Geral

**Beacon** e uma plataforma de confianca de dados que detecta anomalias silenciosas antes que elas contaminem dashboards e decisoes de negocio. Diferente de ferramentas de visualizacao (Metabase) ou monitoramento de infra (Grafana), o Beacon atesta a qualidade do dado em si — ele aprende o comportamento normal das tabelas e alerta quando algo fica estranho, mesmo que ninguem tenha configurado uma regra especifica para aquilo.

**Arquitetura hibrida:** um agente leve roda na infra do cliente (proximo aos dados), faz profiling estatistico e deteccao local. Um dashboard cloud centraliza a gestao, historico e disparo de alertas.

**Posicionamento:** "Metabase mostra o que aconteceu. Beacon garante que o que eles estao mostrando e verdade."

---

## 2. Problema & Solucao

**Problema:**
Times de dados convivem com o medo silencioso de que os dados estejam corrompidos. Uma coluna que muda de tipo, um campo que comeca a vir nulo, uma distribuicao que se altera sem ninguem perceber — o dashboard continua verde, o Grafana nao apita, mas o relatorio que o CEO vai ler esta errado. Hoje, engenheiros de dados gastam ate 30% do tempo escrevendo e mantendo scripts defensivos de validacao (queries SQL manuais) em vez de construir features. E ainda assim, so monitoram o que lembraram de configurar.

**Solucao:**
O Beacon se conecta ao banco de dados, faz profiling automatico de schema, volume e distribuicoes estatisticas, aprende o baseline historico e detecta desvios por metodos estatisticos (z-score). Quando uma anomalia e detectada, envia alertas com evidencia + recomendacao pratica, permitindo que o time aja antes que o dado contaminado se propague. Tudo com setup de 5 minutos — sem escrever uma unica query de validacao.

---

## 3. Publico-Alvo

| Campo | Descricao |
|---|---|
| **Quem e** | Engenheiros de dados, analistas de dados e times de DataOps |
| **Contexto** | Gerenciam pipelines de ingestao e transformacao, alimentam dashboards e relatorios criticos para o negocio |
| **Dor principal** | Incerteza sobre a qualidade dos dados. "O numero no dashboard esta certo?" e uma pergunta constante. Detectam problemas apenas quando alguem reclama — nunca antes. |

---

## 4. Funcionalidades

### MVP (v1)
- [ ] Agente local: instalacao via 1 comando, vinculacao com token ao cloud
- [ ] Conexao com PostgreSQL (profiling automatico ao conectar)
- [ ] Profiling estatistico: schema scan, volume baseline, perfil por coluna (distribuicao, nulos, cardinalidade)
- [ ] Deteccao de anomalias por z-score (linha de base aprendida localmente)
- [ ] Alertas por email com evidencia + recomendacao pratica
- [ ] Dashboard cloud: status dos data sources, feed de anomalias, fila de jobs, notificacoes
- [ ] Configuracao remota de pipelines e schedules via dashboard
- [ ] Frequencia de checagem configuravel por pipeline/tabela
- [ ] Agente resiliente: heartbeat, fila offline, nunca emite alerta fantasma

### Futuro / Nice-to-have
- Suporte a MySQL, BigQuery, Google Sheets
- Alertas via Slack
- Metodos estatisticos avancados (IQR, medias moveis)
- Multi-membro e workspaces com papeis (Owner, Editor, Viewer)
- Relatorio semanal automatico
- Blackout windows por pipeline
- Comparacao entre tabelas e inferencia de relacionamentos

---

## 5. Stack Tecnologica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Cloud Backend | Python 3.13 + FastAPI | REST API, async, ecossistema Python para dados |
| Cloud Frontend | React 19 + TypeScript + TailwindCSS v4 | SPA com component library propria (Radix + Lucide) |
| Cloud Database | PostgreSQL 16 + SQLAlchemy 2.0 | Robusto, suporte a JSONB, UUID, enumeracoes |
| Agente Local | Python (mesma stack do backend) | Reaproveitamento de codigo (conectores, deteccao), ecossistema de dados |
| Cache | Redis | Cache de configuracao de pipelines e resultados |
| Auth | JWT (dashboard) + API Keys (agentes/conectores) | Duplo metodo: usuarios web vs agentes maquina |
| Build Tools | Vite (frontend), Uvicorn (backend) | Rapido, moderno |

---

## 6. Arquitetura de Alto Nivel

```
┌──────────────────────────────┐      ┌──────────────────────────────────┐
│        AGENTE LOCAL           │      │          BEACON CLOUD             │
│     (infra do cliente)        │      │        (beacon.app)               │
│                              │      │                                  │
│  ┌──────────────────────┐    │      │  ┌────────────────────────────┐  │
│  │  Conector PostgreSQL │    │      │  │  Dashboard React SPA       │  │
│  │  (profiling + query) │    │ HTTPS │  │  (status, anomalias, jobs) │  │
│  └──────────┬───────────┘    │ ────► │  └────────────┬───────────────┘  │
│             │                │       │               │                  │
│  ┌──────────▼───────────┐    │       │  ┌────────────▼───────────────┐  │
│  │  Motor de Deteccao   │    │       │  │  FastAPI REST API          │  │
│  │  (z-score, baseline) │    │       │  │  (config, alert dispatch)  │  │
│  └──────────┬───────────┘    │       │  └────────────┬───────────────┘  │
│             │                │       │               │                  │
│  ┌──────────▼───────────┐    │       │  ┌────────────▼───────────────┐  │
│  │  Buffer Offline      │    │       │  │  PostgreSQL + Redis        │  │
│  │  (fila local)        │    │       │  │  (users, workspaces,       │  │
│  └──────────────────────┘    │       │  │   anomaly history)         │  │
│                              │       │  └────────────────────────────┘  │
│  O agente NUNCA sobe dado   │       │                                  │
│  cru — apenas resumos       │       │  ┌────────────────────────────┐  │
│  estatisticos e metadados   │       │  │  Notificadores             │  │
│  de schema.                 │       │  │  (Email, Slack)            │  │
└──────────────────────────────┘       │  └────────────────────────────┘  │
                                       └──────────────────────────────────┘
```

**Fluxo principal:**
1. Usuario instala agente local com 1 comando (curl + token)
2. Agente conecta no banco do cliente, faz profiling automatico
3. Resumos estatisticos e metadados de schema sobem pro cloud (nunca dados crus)
4. Agente detecta anomalias localmente (z-score) e sobe eventos de alerta pro cloud
5. Cloud dispara notificacoes (email/Slack) e exibe no dashboard
6. Usuario configura pipelines, thresholds e schedules 100% via dashboard cloud

---

## 7. Integracoes Externas

| Servico | Finalidade |
|---|---|
| SendGrid | Envio de alertas por email |
| Slack Webhook | Envio de alertas para canais Slack |
| PostgreSQL (cliente) | Fonte de dados monitorada pelo agente |
| Redis | Cache de configuracao e resultados recentes |

---

## 8. Requisitos Nao-Funcionais

- **Escala esperada:** v1: dezenas de clientes, centenas de data sources. Agente: profiling em tabelas de ate dezenas de milhoes de linhas (com amostragem).
- **Disponibilidade:** Cloud deve ter alta disponibilidade (dashboard e dispatch de alertas). Agente tolera offline (buffer local).
- **Seguranca / Compliance:** Credenciais de banco ficam ONLY no agente local (nunca sobem pro cloud). API Keys hasheadas (SHA-256). JWT com refresh token. Conexao agente-cloud via HTTPS.
- **Performance:** Profiling incremental por default (so novas linhas). Full scan + amostragem apenas sob demanda ou quando impacto significativo.

---

## 9. Fora do Escopo

- ~~Alertas por SMS, PagerDuty, webhooks customizados~~
- ~~Integracao com GitHub/CI-CD para inferencia de causa-raiz~~
- ~~Auto-pause de pipelines downstream (o Beacon detecta, nao age nos dados)~~
- ~~Comparacao entre tabelas, inferencia de relacionamentos~~
- ~~Validacao de formato (email, CEP, telefone)~~

---

## 10. Referencias & Inspiracoes

| Referencia | O que aproveitar |
|---|---|
| Monte Carlo | Data observability — referencia de categoria, mas requer acesso direto aos dados |
| Great Expectations | Testes declarativos de qualidade de dados — referencia de profiling, mas exige configuracao manual |
| Soda | Monitoramento de dados — referencia de alertas, porem foco em regras explicitas |
| Anomalo | Deteccao de anomalias em tables — referencia de ML aplicado a dados |

**Diferencial Beacon:** Setup em 5 minutos, deteccao passiva (sem regras manuais), agente local (dados nunca saem da infra do cliente).

---

## Notas & Decisoes em Aberto

- [ ] Nome do agente local (beacon-agent? beacon-cli? sentinel?)
- [ ] Modelo de precificacao (por data source? por volume? por seat?)
- [ ] Formato do pacote de instalacao do agente (pip? binario? Docker?)
- [ ] Estrategia de atualizacao do agente (auto-update? manual?)
- [ ] Periodo minimo de baseline para deteccao confiavel (1 semana? 1 mes?)
