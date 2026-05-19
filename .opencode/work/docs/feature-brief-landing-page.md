# Feature Brief — Landing Page do Beacon

> **Status:** Rascunho | **Data:** 2026-05-18 | **Projeto:** Beacon
> **Tipo:** Nova feature

---

## 1. User Story (JTBD)

**Quando** um potencial usuário ou decisor ouve falar do Beacon,
**o visitante quer** entender o que é, qual problema resolve e por que confiar
**para** decidir criar uma conta ou recomendar a ferramenta.

---

## 2. Contexto & Motivação

Beacon hoje não tem página pública. Quem acessa `beacon.app` cai direto no `/login` — não há como entender o produto antes de se cadastrar. As únicas rotas públicas são `/login` e `/register`. Toda ferramenta SaaS precisa de uma landing page para descoberta, conversão e credibilidade. Beacon está funcional, o produto funciona, mas a "fachada" não existe. Essa landing page resolve isso com uma única página que serve tanto o engenheiro de dados que quer testar quanto o CTO que quer avaliar.

---

## 3. Fluxo Esperado (Happy Path)

1. Visitante acessa `beacon.app` (não autenticado)
2. Vê a landing page: hero com headline de urgência + mensagem de privacidade + CTA "Criar conta grátis"
3. Scrolla pelas seções: Como funciona (3 steps) → Antes vs. Depois → Comparação → Persona cards → CTA final
4. Clica em "Criar conta grátis" → vai para `/register`
5. Cria conta → é redirecionado para o Dashboard (`/`)

**Caminho alternativo:** Visitante que já tem conta clica em "Já tenho conta" → vai para `/login`

---

## 4. Escopo (MoSCoW)

| Prioridade | O que é | Justificativa |
|-----------|---------|---------------|
| **Must** (v1) | Hero section: headline *"Seus dados estão saudáveis? Descubra antes que alguém perceba."* + subtítulo com privacidade *"Sem que seus dados saiam do seu servidor."* + CTA "Criar conta grátis" + link "Já tenho conta" | É a primeira impressão. Precisa comunicar valor + diferenciador de privacidade em 5 segundos |
| **Must** (v1) | Seção "Como funciona" — 3 passos visuais: (1) Instale o agente — processamento 100% local, (2) Conecte seu banco, (3) Receba alertas | Explica o modelo híbrido agente+nuvem de forma didática. Reforça que dados não saem da infra |
| **Must** (v1) | Seção "Antes vs. Depois" — contraste emocional: antes você descobre dado quebrado quando o CFO pergunta; depois você recebe alerta antes de qualquer um notar | Cria identificação emocional com a dor real do público |
| **Must** (v1) | Tabela de comparação: Beacon vs. monitoramento manual vs. ferramentas de BI vs. testes de dados tradicionais | Posiciona Beacon no mercado. Ajuda o decisor a entender o diferencial |
| **Must** (v1) | Seção "Quem deveria usar" — cards por persona: Engenheiro de Dados, Analista, CTO | Ajuda o visitante a se identificar. Cada card destaca o benefício mais relevante para aquela persona |
| **Must** (v1) | CTA final — "Criar conta grátis" | Fecha a página com ação. Visitante já foi convencido, agora age |
| **Must** (v1) | Roteamento condicional: não autenticado → landing page; autenticado → Dashboard | Evita que usuários logados vejam a landing ao acessar `/`. Mantém o comportamento atual para usuários existentes |
| **Should** (v1) | Design 100% responsivo (mobile) | Engenheiros podem chegar por link no celular. Experiência mobile não pode ser quebrada |
| **Should** (v1) | SEO metadata: `<title>`, `<meta description>`, Open Graph tags | Importante para descoberta orgânica e compartilhamento em redes sociais |
| **Should** (v1) | Performance: carregamento em <2s, Lighthouse >90 | Landing page lenta = perda de conversão. Por ser estática, é uma meta alcançável |
| **Could** (v2) | Seção de FAQ — "Meus dados saem do servidor?", "Precisa de cartão?", "Quanto custa?" | Útil se surgirem dúvidas recorrentes de usuários. Não bloqueia v1 |
| **Could** (v2) | Seção de integrações — cards com PostgreSQL, MySQL, BigQuery, Google Sheets | Reforça cobertura e roadmap. V1 já menciona integrações nos steps de "Como funciona" |
| **Won't** (agora) | Seção de pricing / planos | Ainda não definido. Entra quando o modelo de precificação for decidido |
| **Won't** (agora) | Prova social — logos de clientes, cases, depoimentos | Produto muito early. Não há clientes para mostrar. Adicionar quando houver tração |
| **Won't** (agora) | Blog / página de recursos | Fora do escopo de uma landing page inicial. Pode evoluir depois |

---

## 5. Regras de Negócio

- Visitante **não autenticado** que acessa `/` → vê a landing page
- Visitante **autenticado** que acessa `/` → vê o Dashboard (comportamento atual preservado)
- CTA principal "Criar conta grátis" → redireciona para `/register`
- Link secundário "Já tenho conta" → redireciona para `/login`
- A landing page é uma rota pública — não requer autenticação
- Design da landing usa os mesmos tokens do produto (cores, fonte Inter, ícones Lucide) para manter coesão visual

---

## 6. Edge Cases & Estados de Erro

| Cenário | Comportamento Esperado |
|---------|----------------------|
| Usuário autenticado acessa `/` | Vê o Dashboard, não a landing. Evita confusão de usuário logado vendo página de "crie sua conta" |
| Usuário não autenticado acessa `/login` ou `/register` | Vê as páginas de auth normalmente. Comportamento atual mantido — landing não interfere |
| Acesso por dispositivo mobile | Landing deve ser 100% responsiva. Todas as seções adaptam layout (stack vertical, imagens redimensionadas) |
| Link compartilhado no WhatsApp/LinkedIn | Open Graph tags populadas → preview com título, descrição e imagem do Beacon |
| Buscador (Google) indexa a página | `<title>` e `<meta description>` otimizados para SEO. Conteúdo semântico acessível |
| Usuário com JavaScript desabilitado | > _A definir_ — landing simples pode funcionar com SSR/SSG ou fallback HTML |
| Acesso via leitor de tela | Seguir WCAG 2.1 AA: headings hierárquicos, alt text, contraste 4.5:1, navegação por teclado |

---

## 7. Métricas de Sucesso

| Métrica | Alvo | Como Medir |
|---------|------|-----------|
| Taxa de conversão (landing → `/register`) | >5% dos visitantes | Analytics — clique no CTA / total de visitantes únicos |
| Taxa de criação de conta (visitantes que se registraram) | >3% dos visitantes | Analytics — registros concluídos / total de visitantes únicos |
| Taxa de rejeição (bounce rate) | <60% | Analytics — sessões de página única sem interação |
| Tempo médio na página | >30s (indicador de engajamento) | Analytics — duração da sessão na landing |
| Performance (Lighthouse) | Performance >90, Accessibility >90 | Lighthouse / PageSpeed Insights |
| Tempo de carregamento | <2s (First Contentful Paint) | Lighthouse / Web Vitals |

---

## 8. Dependências & Riscos

- **Dependências técnicas:** Nenhuma externa. A landing é uma nova rota/página no frontend React existente, usando o mesmo stack (Vite + TailwindCSS v4 + Lucide React).
- **Dependências de produto:** O fluxo de registro (`/register`) e login (`/login`) já existem e funcionam. Nenhuma dependência bloqueante.
- **Riscos:**

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| **Roteamento conflitante** — `/` hoje é o Dashboard autenticado. Landing precisa de lógica condicional no mesmo path | Média | Alto — pode quebrar experiência de usuários existentes | Implementar com condição simples: `isAuthenticated ? <Dashboard /> : <Landing />`. Testar ambos os fluxos |
| **Design inconsistente** — landing com cara de "marketing" vs. dashboard com cara de "produto" | Média | Médio — passa sensação de produto amador | Usar os mesmos tokens visuais (cores Tailwind, fonte Inter, ícones Lucide). Definir uma paleta de seções clara |
| **Conteúdo desatualizado** — passos, comparação, personas podem divergir do produto real conforme evolui | Alta | Baixo — conteúdo estático, fácil de corrigir | Componentizar cada seção como componente React isolado para edição pontual |
| **Produto early sem pricing/prova social** — visitante pode sentir que falta informação | Média | Médio — pode reduzir conversão | O tom honesto e direto compensa. A página fala sobre o que EXISTE, não sobre o que falta. CTA "grátis" remove atrito |
| **SEO canibalização** se landing e app coexistirem mal | Baixa | Baixo | Landing é a única página em `/`. Dashboard está atrás de auth. Sem conflito |

---

## 9. Referências

| Tipo | Link / Descrição |
|------|-----------------|
| Figma (design system do Beacon) | `uq30Y3KWwjVleDbBJwmlUz` — usar tokens de cor, fonte Inter e ícones Lucide como base |
| Figma (landing page em si) | > _A definir_ — design visual da landing ainda não existe |
| Issue relacionada | N/A — repositório não tem issues ainda |
| Produto similar / inspiração | > _A definir_ — landing pages de SaaS similares (Monte Carlo, Soda, Metaplane) podem servir de referência |
| Project Brief do Beacon | `.opencode/work/docs/project-brief-beacon.md` |

---

## Notas & Decisões em Aberto

- [ ] Design visual da landing no Figma — mockup ainda não existe
- [ ] Definir referências visuais de landing pages de concorrentes/inspiração (Monte Carlo, Soda, Metaplane?)
- [ ] Decisão técnica: landing como rota dentro do SPA React ou como página estática separada (SSG/host distinto)?
- [ ] Analytics — qual ferramenta usar para medir as métricas? (Plausible, PostHog, Google Analytics?)

---

> **Handoff sugerido:**
> ```
> @issue-crafter .opencode/work/docs/feature-brief-landing-page.md
> ```
