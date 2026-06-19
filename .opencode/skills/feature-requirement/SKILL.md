---
name: feature-requirement
description: Gera um Feature Requirement (documento de requisito) em Markdown a partir da discussao de uma feature — o doc canonico que orchestrator-tdd, orchestrator-nontdd e plan-maker consomem como input. Foca SO no requisito (o que / por que): JTBD, fluxo, criterios de aceite, regras de negocio, edge cases, escopo MoSCoW e metricas. NAO contem especificacao tecnica (contrato de API, modelo de dados, arquitetura) nem navegacao em codigo. Use quando o product-manager (ou qualquer agente) discutiu escopo, criterios de aceite e regras de uma feature. Trigger: "feature requirement", "documenta a feature", "gera o requisito", "documenta pro orchestrator", ou ao final de uma conversa de product discovery. A skill pergunta o que faltar antes de gerar o arquivo final.
---

# Feature Requirement Generator

Gera um **Feature Requirement** completo — o documento de requisito padronizado que o pipeline (orchestrator / plan-maker) recebe como entrada.

Foca **somente no requisito**: o **quê** precisa existir e o **porquê**. Descreve o problema, o fluxo, os criterios de aceite, as regras de negocio e o escopo — em linguagem de produto, observavel e testavel.

**Este documento NAO contem especificacao tecnica.** Contrato de API, modelo de dados, migrations, escolha de arquitetura e decisoes de implementacao **NAO vao aqui** — o COMO e do `@tech-lead` / orchestrator. Quem escreve este doc **nao navega no codigo** — trabalha apenas do que foi discutido.

O template vive AQUI (nesta skill), nao em nenhuma pasta de projeto — assim funciona em qualquer repo.

## Fluxo

### 1. Extrair da conversa
Tente preencher destes campos a partir do que ja foi discutido (NAO leia o codigo):

| Campo | Sinais na conversa |
|---|---|
| **Nome / Tipo / Prioridade** | "feature de X", "melhoria em Y", urgencia |
| **Problema & Objetivo (JTBD)** | a dor de hoje, o resultado desejado, quem usa |
| **Contexto & Motivacao** | por que importa, o que existe hoje e por que nao basta |
| **Fluxo (Happy Path)** | passo a passo do fluxo ideal, do gatilho ao resultado |
| **Criterios de Aceite** | "quando <acao>, entao <resultado observavel>" |
| **Escopo (MoSCoW)** | o que e must / should / could / won't |
| **Regras de Negocio** | validacoes, permissoes, workflows, limites |
| **Edge Cases & Estados** | falha, vazio, sem permissao, loading, erro, sucesso (comportamento esperado) |
| **Nao-Objetivos** | o que explicitamente fica fora |
| **Metricas** | como medir sucesso, targets |
| **Dependencias & Riscos** | outras features que precisam existir, suposicoes arriscadas (nivel produto) |
| **Referencias** | Figma, mockups, produtos similares, issues |

### 2. Identificar lacunas e perguntar
Se algum campo essencial estiver ausente ou vago, **pergunte antes de gerar o arquivo**.

**Obrigatorios** (sem eles o requisito nao serve de input):
- Problema & Objetivo (JTBD)
- Fluxo Happy Path (pelo menos 3 passos)
- Pelo menos 2 Criterios de Aceite testaveis
- Pelo menos 1 Must-have no MoSCoW
- Se houver logica: Regras de Negocio & Edge Cases

**Como perguntar:**
- Agrupe TODAS as perguntas em UMA unica mensagem, numeradas
- Seja direto e contextualizado com o que ja foi discutido
- Nao pergunte o que ja foi respondido
- Maximo de 5 perguntas por rodada
- Para campos sem resposta, use `> _A definir_` e marque os criticos

**Exemplo:**
```
Antes de gerar o Feature Requirement, so mais alguns detalhes:

1. Qual e o fluxo ideal? Passo a passo do usuario, do gatilho ao resultado final
2. Quando isso "funciona"? Me da 2-3 criterios observaveis ("quando X, entao Y")
3. Tem regra de negocio especifica? (validacoes, permissoes, limites?)
4. O que acontece se der erro? (rede fora, dado invalido, sem permissao, lista vazia?)

Com isso finalizo o documento.
```

### 3. Gerar o arquivo
Com as informacoes suficientes, salve em `.opencode/work/docs/feature-requirement-<slug>.md` usando o template abaixo. `<slug>` = kebab-case do nome da feature. Para campos sem informacao, use `> _A definir_`.

---

## Template do Feature Requirement

```markdown
# Feature Requirement — <titulo curto da funcionalidade>

> **Status:** Rascunho | **Data:** [DATA_HOJE] | **Projeto:** [contexto do projeto]
> **Tipo:** [Nova feature / Melhoria / Refatoracao de UX]
> Documento de requisito (o que / por que). NAO contem especificacao tecnica — o COMO
> (arquitetura, contrato de API, modelo de dados) e do @tech-lead / orchestrator.
> Campos `(obrigatorio)` sao o minimo pro orchestrator/plan-maker planejar sem chutar.
> Vazio desconhecido = `> _A definir_`.

---

## 1. Identificacao
- **Nome:** <nome da feature>
- **Tipo:** feature | melhoria | bug | refactor | chore | docs
- **Prioridade:** alta | media | baixa
- **Issue/link relacionado:** <#num ou URL, ou N/A>

## 2. Problema & Objetivo *(obrigatorio)*
**Problema:** <a dor de hoje — nao a solucao>
**Objetivo:** <resultado desejado em 1-2 frases>
**User Story (JTBD):** Quando <situacao/gatilho>, o <persona> quer <acao/motivacao> para <resultado/outcome>.

## 3. Contexto & Motivacao
[2-3 frases: por que isso importa? Qual o trabalho que o usuario tenta fazer? O que existe hoje e por que nao e suficiente?]

## 4. Fluxo Esperado (Happy Path) *(obrigatorio)*
1. [Gatilho] → [Passo 1]
2. [Passo 2]
3. [Passo 3]
4. [Resultado final]

## 5. Criterios de Aceite *(obrigatorio)*
> Cada item observavel e testavel: "quando <acao>, entao <resultado visivel>". Viram checkboxes e base dos testes.
- [ ] Quando <acao/condicao>, entao <resultado observavel>
- [ ] Quando <...>, entao <...>

## 6. Escopo (MoSCoW)
| Prioridade | O que e | Justificativa |
|-----------|---------|---------------|
| **Must** (v1) | [Feature essencial] | [Por que e indispensavel] |
| **Should** (v1) | [Feature importante] | [Importante mas nao bloqueante] |
| **Could** (v2) | [Feature desejavel] | [Pode esperar] |
| **Won't** (agora) | [Feature fora de escopo] | [Por que nao agora] |

## 7. Regras de Negocio *(obrigatorio se houver logica)*
- [Regra 1 — validacao, permissao, workflow, limite]
- [Regra 2]

## 8. Edge Cases & Estados de Erro
| Cenario | Comportamento Esperado |
|---------|----------------------|
| [Rede fora / timeout] | [Mostrar mensagem? Retry?] |
| [Dado invalido / mal formatado] | [Validacao? Mensagem de erro?] |
| [Estado vazio (sem dados)] | [Empty state? O que o usuario ve?] |
| [Sem permissao / nao autenticado] | [Bloqueia? Redireciona? Mensagem?] |
| [Loading / sucesso] | [Feedback ao usuario] |

## 9. Nao-Objetivos (Out of Scope)
- <o que explicitamente NAO faz parte desta feature>

## 10. Metricas de Sucesso
| Metrica | Alvo | Como Medir |
|---------|------|-----------|
| [Metrica 1] | [Valor alvo] | [Ferramenta/metodo] |

## 11. Dependencias & Riscos
- **Dependencias de produto:** [Outras features que precisam existir primeiro]
- **Riscos:** [Maior suposicao? O que pode dar errado?]

## 12. Referencias
| Tipo | Link / Descricao |
|------|-----------------|
| Figma | [URL ou N/A] |
| Issue relacionada | [#numero ou N/A] |
| Produto similar / inspiracao | [Nome/URL ou N/A] |

---

## Notas & Decisoes em Aberto
- [ ] [Decisao pendente]
- [ ] [Questao a validar antes do plano]
```

---

## Regras gerais
- **Foco no requisito** — o quê e o porquê. NUNCA inclua contrato de API, modelo de dados, migrations, escolha de stack ou decisao de arquitetura. Isso e do `@tech-lead` / orchestrator.
- **Sem navegacao em codigo** — esta skill nao le o codigo-fonte; gera o doc a partir do que foi discutido e do contexto de produto ja coletado (inclusive via explorer barato, quando a documentacao era escassa).
- **Nunca invente informacoes** — use `> _A definir_` para campos vazios e marque os criticos.
- **Nao inclua tabelas completamente vazias** — se nao ha edge cases, coloque `> _Nenhum edge case identificado ate o momento._`
- **Fiel ao discutido** — nao "melhore" o escopo sem ser solicitado.
- **Adapte secoes ao contexto** — se a conversa foi puramente sobre metricas, expanda a secao 10 e reduza as outras.
- **Tom:** profissional mas direto. Sem jargao tecnico desnecessario.
- Apos gerar, informe o path completo: `.opencode/work/docs/feature-requirement-<slug>.md` e aponte o proximo passo: `@orchestrator-tdd|nontdd|plan-maker <path>`.
- Termine com uma mensagem curta perguntando se quer ajustar algo.
