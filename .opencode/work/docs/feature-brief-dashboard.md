# Feature Brief — Dashboard do Beacon

> **Status:** Rascunho | **Data:** 2026-05-18 | **Projeto:** Beacon
> **Tipo:** Melhoria / Refatoração de UX

---

## 1. User Story (JTBD)

**Quando** o usuário recebe um alerta de anomalia (incêndio) ou quer monitorar a saúde dos seus dados,
**o engenheiro/analista de dados quer** entender rapidamente o que está acontecendo ou ter uma visão geral do sistema
**para** agir em problemas críticos antes que afetem o negócio ou verificar que tudo está funcionando sem precisar vasculhar logs.

---

## 2. Contexto & Motivação

A Dashboard já existe (`DashboardPage.tsx`, Sprint 1) com cards de contagem e feeds básicos, mas é mínima. Não distingue entre os dois modos de uso reais do Beacon: (1) **apagar incêndio** — o usuário clica num link de email e precisa ver a anomalia IMEDIATAMENTE, com contexto pra agir; (2) **monitorar** — o usuário abre a Dashboard por conta própria e quer sentir o pulso do sistema num piscar de olhos.

A Dashboard atual também não tem estados vazios — um usuário novo que conectou seu primeiro banco não tem orientação sobre o que fazer. Esta refatoração transforma a Dashboard na verdadeira "casa" do Beacon, servindo ambos os modos de uso com clareza.

---

## 3. Fluxo Esperado (Happy Path)

### Modo 1: Apagar incêndio 🔥

1. Usuário recebe email de alerta do Beacon: *"Anomalia crítica detectada: volume da tabela orders caiu 87%"*
2. Clica no link do email → deep link para `/anomalies/:id`
3. Vê detalhe completo da anomalia: baseline vs. valor atual, z-score, severidade, recomendação prática
4. Age com base na recomendação (ex: verificar pipeline de ingestão)
5. Pode navegar para o Dashboard ou voltar ao email

### Modo 2: Monitorar 📊

1. Usuário abre `beacon.app` (autenticado) → vê a Dashboard
2. **1º segundo:** indicador de saúde no topo — "3 de 5 data sources saudáveis" com cor 🟢
3. **5 segundos:** escaneia os cards de data source, nota que um está 🟡 (warning)
4. Clica no card → página de detalhe do data source com gráfico de anomalias, pipelines ativos, feed filtrado
5. Volta ao Dashboard, scrolla até o feed de atividade unificado — últimos 5 eventos (anomalias + pipeline runs)
6. Clica em "Ver tudo" → `/anomalies` para explorar histórico completo

### Modo 3: Primeiro acesso (sem data sources)

1. Usuário novo, recém-registrado, acessa o Dashboard
2. Não tem nenhum data source → vê onboarding guiado:
   - Checklist visual: "① Conecte um banco → ② Configure um pipeline → ③ Receba seu primeiro alerta"
   - CTA principal: "Conectar primeiro banco" → `/datasources/new`
3. Após conectar o primeiro banco, a Dashboard ganha vida com o indicador de saúde e os cards

---

## 4. Escopo (MoSCoW)

| Prioridade | O que é | Justificativa |
|-----------|---------|---------------|
| **Must** (v1) | Indicador de saúde: score simples — "3 de 5 data sources saudáveis" com número grande + cor (🟢/🟡/🔴) | É a primeira coisa que o usuário vê. Responde "tá tudo bem?" em 1 segundo. Ambos os modos se beneficiam |
| **Must** (v1) | Grid de cards por data source: status (🟢/🟡/🔴/⚫), nome, última checagem, nº de anomalias ativas. Clicável → `/datasources/:id` | Permite drill-down por banco. É o próximo nível de granularidade após o indicador geral |
| **Must** (v1) | Feed de atividade unificado: últimos 5 itens mesclando anomalias + pipeline runs em ordem cronológica. Item clicável → detalhe | Substitui os dois feeds separados atuais. Mais limpo e evita competição visual. Dá contexto rápido do que aconteceu |
| **Must** (v1) | Link "Ver tudo" no feed → `/anomalies` | Dá escape para exploração mais profunda sem poluir a Dashboard |
| **Must** (v1) | Página de detalhe do data source: gráfico de anomalias (timeline), pipelines ativos, anomalias recentes, metadados/config | Dependência dos cards clicáveis. É o "mini-dashboard" por banco. Sem ela, os cards perdem propósito |
| **Must** (v1) | Deep link email → `/anomalies/:id`: página de detalhe da anomalia com evidências, baseline, z-score, severidade, recomendação | Resolve o modo incêndio. O usuário chega pelo email e vê tudo que precisa sem navegar |
| **Must** (v1) | Estados vazios contextuais: onboarding wizard (0 data sources) vs. "Tudo certo" (>0 data sources, 0 anomalias) | Experiência de primeiro uso define se o usuário fica ou abandona. Não pode ser uma página em branco |
| **Should** (v1) | Cards de data source responsivos — grid quebra em múltiplas linhas conforme largura da tela | Usuários com dezenas de bancos conectados precisam scrollar verticalmente. Layout fixo quebraria |
| **Should** (v1) | Consistência de cores: verde/amarelo/vermelho/cinza com o mesmo significado em todo o Dashboard | Evita confusão. Se verde = saudável no indicador, não pode significar outra coisa no card |
| **Should** (v1) | Indicador de agente offline nos cards de data source (⚫ "Agente offline") | Sem heartbeat, o data source não está sendo monitorado. Usuário precisa saber |
| **Should** (v1) | Badge "Resolvida" no detalhe de anomalia (quando aplicável) + timestamp de resolução | Anomalia pode ter sido resolvida entre o envio do email e o clique. Usuário não pode achar que ainda está ativa |
| **Could** (v2) | Filtro de período no feed de atividade: "Últimas 24h", "Últimos 7 dias", "Últimos 30 dias" | Útil para exploração, mas o feed de 5 itens + "Ver tudo" já resolve o essencial |
| **Could** (v2) | Ações rápidas no card de data source: "Executar pipeline agora", "Pausar monitoramento" | Conveniência, mas depende de APIs que podem não existir ainda |
| **Could** (v2) | Gráfico de tendência no indicador de saúde: mini-sparkline de anomalias/dia na última semana | Dá contexto temporal sem precisar scrollar. Bom, mas não essencial pra v1 |
| **Won't** (agora) | Atualização em tempo real via WebSocket | v1 usa polling/refetch via React Query. WebSocket adiciona complexidade de infra desnecessária agora |
| **Won't** (agora) | Dashboard customizável (arrastar, esconder, reordenar widgets) | Overengineering pra fase atual. Estrutura fixa cobre os casos de uso |
| **Won't** (agora) | Exportar/PDF do Dashboard | Fora de escopo. Pode entrar como feature separada se houver demanda |

---

## 5. Regras de Negócio

- **Indicador de saúde:** `data_sources saudáveis / total de data_sources`. Cor: 🟢 se todos saudáveis; 🟡 se pelo menos 1 warning; 🔴 se pelo menos 1 critical; ⚫ se agente offline
- **Card de data source clicável** → navega para `/datasources/:id` (página de detalhe)
- **Item do feed clicável:** anomalia → `/anomalies/:id`; pipeline run → `/pipelines/:pipelineId/runs`
- **Deep link de email:** URL no formato `beacon.app/anomalies/:id` — backend precisa gerar esse link no template de email
- **Feed unificado:** últimos 5 itens, ordenados por `detected_at` (anomalia) ou `finished_at` (pipeline run), mais recente primeiro. Mescla as duas fontes
- **Estados vazios:**
  - 0 data sources → onboarding wizard com checklist + CTA "Conectar primeiro banco"
  - >0 data sources e 0 anomalias → cards com status 🟢 + mensagem no feed: "Tudo certo — nenhuma anomalia detectada nas últimas 24h"
- **Status do data source** no card é derivado da anomalia mais severa ativa (não resolvida). Se não há anomalias ativas → 🟢
- **"Última checagem"** no card de data source = `finished_at` do pipeline run mais recente daquele banco
- **Página de detalhe do data source** exibe apenas dados daquele banco específico (gráfico, pipelines, anomalias filtradas por `data_source_id`)

---

## 6. Edge Cases & Estados de Erro

| Cenário | Comportamento Esperado |
|---------|----------------------|
| Deep link de anomalia já resolvida | Exibe detalhe normalmente + badge "Resolvida" com timestamp. Não mostra como incêndio ativo |
| Deep link de anomalia com ID inválido | Página 404 amigável: "Anomalia não encontrada" + link "Voltar ao Dashboard" |
| Usuário com dezenas de data sources | Grid de cards responsivo — quebra em múltiplas linhas. Scroll vertical. Sem paginação nos cards (todos visíveis) |
| Agente offline (sem heartbeat) | Card do data source mostra ⚫ "Agente offline" + "Última checagem: há X horas". Indicador de saúde ignora data sources offline no cálculo? → Tratar como status à parte |
| Feed vazio após filtro | Mensagem contextual: "Nenhuma atividade para este período." |
| Dashboard carregando (primeira vez) | Skeleton loading: placeholders animados para o indicador, cards e feed. Evita layout shift |
| Erro ao carregar dados (API offline) | Cada seção com tratamento de erro independente: card com mensagem "Erro ao carregar" + botão "Tentar novamente". Não quebra a página inteira |
| Data source sem pipeline configurado | Card mostra 🟡 "Pipeline não configurado" como warning. Feed não terá runs daquele banco — normal |
| Dois usuários veem a mesma anomalia resolvida em momentos diferentes | Cada um vê o estado atual (resolvida). Sem conflito |
| Usuário clica em deep link mas não está autenticado | Redireciona para `/login`. Após login, redireciona de volta para `/anomalies/:id` (preservar o deep link) |
| Email de alerta com múltiplas anomalias | Email pode listar top anomalias. Cada uma com seu próprio deep link. Ou um link "Ver todas" → Dashboard |

---

## 7. Métricas de Sucesso

| Métrica | Alvo | Como Medir |
|---------|------|-----------|
| Tempo até ação no modo incêndio (clique no email → visualização do detalhe) | <3s | Analytics — timestamp do clique vs. carregamento da página |
| Tempo de carregamento da Dashboard | <2s (First Contentful Paint) | Lighthouse / PageSpeed Insights |
| Usuários que clicam nos cards de data source | >30% dos visitantes da Dashboard | Analytics — eventos de clique nos cards |
| Usuários que clicam em "Ver tudo" no feed | >20% dos visitantes da Dashboard | Analytics — evento de clique no link |
| Taxa de resolução de anomalias (abertas → resolvidas) | Aumento após o redesign — baseline atual desconhecida | Medir antes/depois do novo Dashboard |
| Satisfação do usuário (qualitativo) | "Consigo entender o status em <5 segundos" | Entrevista ou teste de usabilidade com 3-5 usuários |

---

## 8. Dependências & Riscos

### Dependências

- **Dependências técnicas:**
  - Backend: endpoint `GET /api/v1/datasources/:id` com dados agregados (status, pipelines ativos, anomalias recentes) — pode exigir nova rota ou enriquecimento da existente
  - Backend: endpoint `GET /api/v1/anomalies/:id` já existe? Verificar. Precisa retornar evidências (baseline, z-score, recomendação)
  - Backend: template de email de alerta precisa incluir deep link `beacon.app/anomalies/:id`
  - Frontend: React Query para caching e refetch das queries do Dashboard
  - Frontend: `react-router-dom` para deep link `/anomalies/:id`
- **Dependências de produto:**
  - Página de detalhe do data source é NOVA — precisa ser implementada junto com a Dashboard, ou antes
  - Deep link depende do backend gerar URLs corretas nos emails de alerta
  - Estados vazios dependem de saber quantos data sources o usuário tem (endpoint já deve existir)
- **Dependências externas:** Nenhuma

### Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **Escopo crescer** — página de detalhe do data source é uma feature separada que pode inflar | Alta | Alto — atrasa a entrega da Dashboard | Definir escopo mínimo do detalhe: gráfico simples (não precisa ser interativo), lista de pipelines, feed de anomalias. Sem filtros avançados na v1 |
| **Dashboard pesada** — múltiplas chamadas de API (health, cards, feed) podem degradar performance | Média | Médio — lentidão mata a experiência | React Query com staleTime adequado (30s-1min). Dados de health e cards não precisam de real-time. Loading assíncrono por seção |
| **Deep link quebrado** — se o email tem URL errada ou o backend não gera o link corretamente | Baixa | Alto — modo incêndio falha completamente | Testar o fluxo ponta a ponta: alerta → email → link → página. Validar formato da URL no template |
| **Usuário não autenticado no deep link** — perde o contexto da anomalia após login | Média | Médio — fricção desnecessária | Implementar redirect com `returnUrl`: `/login?redirect=/anomalies/:id`. Após login, redireciona de volta |
| **Confusão com múltiplos status** — indicador diz 🟢 mas um card diz 🟡 | Baixa | Baixo — usuário entende hierarquia | Documentar: indicador = saúde geral (pior caso entre todos), cards = status individual. Consistente e intuitivo |

---

## 9. Referências

| Tipo | Link / Descrição |
|------|-----------------|
| Dashboard atual | `frontend/src/pages/DashboardPage.tsx` — implementação Sprint 1 com cards de contagem + 2 feeds |
| Figma (design system) | `uq30Y3KWwjVleDbBJwmlUz` — usar tokens de cor, fonte Inter e ícones Lucide |
| Figma (dashboard em si) | > _A definir_ — design visual da nova Dashboard ainda não existe |
| Issue relacionada | N/A — repositório não tem issues ainda |
| Produto similar / inspiração | > _A definir_ — dashboards de Monte Carlo, Soda, Metaplane, Datadog |
| Project Brief do Beacon | `.opencode/work/docs/project-brief-beacon.md` |
| Feature Brief — Landing Page | `.opencode/work/docs/feature-brief-landing-page.md` |

---

## Notas & Decisões em Aberto

- [ ] Design visual da nova Dashboard no Figma — mockup não existe
- [ ] Definir referências visuais de dashboards de concorrentes (Monte Carlo, Soda, Datadog?)
- [ ] Comportamento do indicador de saúde quando há agentes offline: conta como "não saudável" ou categoria à parte?
- [ ] Página de detalhe do data source: `/datasources/:id` — endpoint atual já retorna todos os dados necessários ou precisa de um novo/enriquecido?
- [ ] Endpoint `GET /api/v1/anomalies/:id` — já existe? Se não, precisa ser criado para o deep link funcionar
- [ ] Deep link após login: implementar `redirect` param na rota `/login` para preservar o destino
- [ ] Feed unificado: backend precisa de um endpoint que mescle anomalias + pipeline runs ou o frontend faz a mesclagem?

---

> **Handoff sugerido:**
> ```
> @issue-crafter .opencode/work/docs/feature-brief-dashboard.md
> ```
