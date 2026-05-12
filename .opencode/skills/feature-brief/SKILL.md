---
name: feature-brief
description: Gera um Feature Brief em Markdown a partir da discussao de uma feature, funcionalidade ou melhoria. Use esta skill quando o product-manager ou qualquer agente tiver discutido escopo, regras de negocio, fluxo de usuario, edge cases ou metricas de uma feature especifica e precisar documentar. Trigger: "feature brief", "documenta essa feature", "cria o brief da feature", ou ao final de uma conversa de product discovery sobre uma feature. A skill faz perguntas para coletar informacoes que faltarem antes de gerar o arquivo .md final.
---

# Feature Brief Generator

Gera um Feature Brief completo em Markdown focado em uma feature ou funcionalidade especifica.

## Fluxo

### 1. Extrair informacoes da conversa

Ao receber o contexto da conversa (via product-manager ou diretamente), tente extrair:

| Campo | Sinais na conversa |
|---|---|
| **Nome da feature** | "vamos fazer X", "preciso de um sistema de Y" |
| **User Story (JTBD)** | "quando... eu quero... para..." ou descricao de problema/usuario/objetivo |
| **Contexto & Motivacao** | Por que isso importa? O que existe hoje? |
| **Fluxo (Happy Path)** | Passo a passo do fluxo ideal |
| **Escopo (MoSCoW)** | O que e must/should/could/won't |
| **Regras de Negocio** | Validacoes, permissoes, workflows, constraints |
| **Edge Cases** | "e se falhar?", "e se estiver vazio?", "e se nao tiver permissao?" |
| **Metricas** | Como medir sucesso? Targets? |
| **Dependencias & Riscos** | APIs, servicos, times, suposicoes arriscadas |
| **Referencias** | Figma, mockups, produtos similares, issues relacionadas |

---

### 2. Identificar lacunas e perguntar

Se algum campo essencial estiver ausente ou vago, **pergunte antes de gerar o arquivo**.

**Campos obrigatorios** (sem eles o brief fica incompleto):
- User Story (JTBD)
- Fluxo Happy Path (pelo menos 3 passos)
- Pelo menos 1 Must-have no MoSCoW

**Campos opcionais** (gere o brief mesmo sem eles, deixando placeholders):
- Metricas
- Dependencias & Riscos
- Referencias

**Como perguntar:**
- Agrupe todas as perguntas em uma unica mensagem, numeradas
- Seja direto e contextualizado com o que ja foi discutido
- Nao pergunte o que ja foi respondido
- Maximo de 5 perguntas por rodada

**Exemplo:**
```
Antes de gerar o Feature Brief, so mais alguns detalhes:

1. Qual e o fluxo ideal? Me da o passo a passo do usuario desde o gatilho ate o resultado final
2. Tem alguma regra de negocio especifica? (validacoes, permissoes, limites?)
3. O que acontece se der erro? (rede fora, dado invalido, sem permissao?)

Com isso finalizo o documento.
```

---

### 3. Gerar o arquivo .md

Com as informacoes suficientes, gere o arquivo em `.opencode/work/docs/feature-brief-<slug>.md`.

Use o template abaixo. Para campos sem informacao: use `> _A definir_` como placeholder.

---

## Template do Feature Brief

```markdown
# Feature Brief — [Nome da Feature]

> **Status:** Rascunho | **Data:** [DATA_HOJE] | **Projeto:** [Contexto do projeto]
> **Tipo:** [Nova feature / Melhoria / Refatoracao de UX]

---

## 1. User Story (JTBD)

**Quando** [situacao/gatilho],
**o** [persona] **quer** [acao/motivacao]
**para** [resultado/outcome].

---

## 2. Contexto & Motivacao

[2-3 frases: por que isso importa? Qual o trabalho que o usuario esta tentando fazer? O que existe hoje e por que nao e suficiente?]

---

## 3. Fluxo Esperado (Happy Path)

1. [Gatilho] → [Passo 1]
2. [Passo 2]
3. [Passo 3]
4. [Resultado final]

---

## 4. Escopo (MoSCoW)

| Prioridade | O que e | Justificativa |
|-----------|---------|---------------|
| **Must** (v1) | [Feature essencial] | [Por que e indispensavel] |
| **Must** (v1) | [Outra feature essencial] | [Justificativa] |
| **Should** (v1) | [Feature importante] | [Importante mas nao bloqueante] |
| **Could** (v2) | [Feature desejavel] | [Pode esperar] |
| **Won't** (agora) | [Feature fora de escopo] | [Por que nao agora] |

---

## 5. Regras de Negocio

- [Regra 1 — validacao, permissao, workflow]
- [Regra 2]
- [Regra 3]

---

## 6. Edge Cases & Estados de Erro

| Cenario | Comportamento Esperado |
|---------|----------------------|
| [Ex: Rede fora do ar / timeout] | [O que acontece? Mostrar mensagem? Retry?] |
| [Ex: Dado invalido / mal formatado] | [Validacao? Mensagem de erro?] |
| [Ex: Estado vazio (sem dados)] | [O que o usuario ve? Empty state?] |
| [Ex: Sem permissao / nao autenticado] | [Bloqueia? Redireciona? Mensagem?] |
| [Ex: Concorrencia / race condition] | [Dois usuarios editando ao mesmo tempo] |

---

## 7. Metricas de Sucesso

| Metrica | Alvo | Como Medir |
|---------|------|-----------|
| [Metrica 1] | [Valor alvo] | [Ferramenta/metodo] |
| [Metrica 2] | [Valor alvo] | [Ferramenta/metodo] |

---

## 8. Dependencias & Riscos

- **Dependencias tecnicas:** [APIs necessarias, servicos, times, bibliotecas]
- **Dependencias de produto:** [Outras features que precisam existir primeiro]
- **Riscos:** [Maior suposicao? O que pode dar errado?]

---

## 9. Referencias

| Tipo | Link / Descricao |
|------|-----------------|
| Figma | [URL ou N/A] |
| Issue relacionada | [#numero ou N/A] |
| Produto similar / inspiracao | [Nome/URL ou N/A] |

---

## Notas & Decisoes em Aberto

- [ ] [Decisao pendente]
- [ ] [Questao a validar]
```

---

## Regras gerais

- **Nunca invente informacoes** que nao foram discutidas. Use `> _A definir_` para campos vazios.
- **Nao inclua tabelas completamente vazias** — se nao ha edge cases identificados, coloque `> _Nenhum edge case identificado ate o momento._`
- **Seja fiel ao que foi discutido** — nao "melhore" o escopo sem ser solicitado.
- **Adapte secoes ao contexto** — se a conversa foi puramente sobre metricas, expanda a secao 7 e reduza as outras.
- **Tom do documento:** profissional mas direto. Sem jargao desnecessario.
- Apos gerar o arquivo, informe o usuario com o path completo: `.opencode/work/docs/feature-brief-<slug>.md`
- Termine com uma mensagem curta perguntando se quer ajustar algo.
