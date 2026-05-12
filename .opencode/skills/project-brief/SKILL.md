---
name: project-brief
description: Gera um Project Brief (one-pager) em Markdown a partir da descricao de uma ideia de projeto de software. Use esta skill sempre que o usuario descrever uma ideia de projeto, produto digital, sistema ou aplicacao e pedir para documentar, estruturar, criar um brief, one-pager, documento de visao, PRD inicial, ou qualquer visao de alto nivel do projeto. Tambem use quando o usuario disser "tenho uma ideia de projeto", "quero documentar meu projeto", "me ajuda a estruturar isso", "cria o brief", ou variacoes. Trigger agressivo: qualquer combinacao de ideia + projeto de software deve acionar esta skill. A skill faz perguntas para coletar informacoes que faltarem antes de gerar o arquivo .md final.
---

# Project Brief Generator

Gera um Project Brief completo em Markdown a partir de uma descricao de ideia de projeto.

## Fluxo

### 1. Extrair informacoes da descricao

Ao receber a descricao do usuario, tente extrair as seguintes informacoes:

| Campo | Exemplos de sinais na descricao |
|---|---|
| **Nome do projeto** | Nome mencionado, sigla, apelido |
| **Problema que resolve** | "o problema e", "hoje as pessoas precisam", "e dificil", "falta" |
| **Solucao proposta** | "quero criar", "a ideia e", "seria um app que" |
| **Publico-alvo** | "para", "usuarios", "empresas", "desenvolvedores", "freelancers" |
| **Funcionalidades** | Lista de features, verbos de acao ("vai fazer X", "permite Y") |
| **Stack tecnologica** | Linguagens, frameworks, bancos de dados mencionados |
| **Integracoes externas** | APIs, servicos de terceiros, pagamentos, auth |
| **Requisitos nao-funcionais** | Escala, seguranca, performance, offline |
| **O que NAO vai ter** | "por enquanto nao", "nao precisa de", "fora do escopo" |
| **Referencias/inspiracoes** | Produtos similares, "tipo o X mas", "parecido com" |

---

### 2. Identificar lacunas e perguntar

Se algum campo essencial estiver ausente ou vago, **pergunte antes de gerar o arquivo**.

**Campos obrigatorios** (sem eles o brief fica vazio demais):
- Problema & Solucao
- Publico-alvo
- Pelo menos 3 funcionalidades do MVP

**Campos opcionais** (gere o brief mesmo sem eles, deixando placeholders):
- Stack tecnologica
- Integracoes externas
- Requisitos nao-funcionais
- Referencias

**Como perguntar:**
- Agrupe todas as perguntas em uma unica mensagem, numeradas
- Seja direto e informal ("So pra completar o brief, me diz:")
- Nao pergunte o que ja foi respondido
- Maximo de 5 perguntas por rodada
- Se o usuario responder parcialmente, complete o que tiver e gere o arquivo

**Exemplo de mensagem de perguntas:**
```
Entendi a ideia! Antes de montar o brief, preciso de mais alguns detalhes:

1. Quem e o publico-alvo principal? (ex: desenvolvedores, pequenas empresas, criadores de conteudo)
2. Quais sao as 3-5 funcionalidades mais importantes do MVP?
3. Voce ja tem alguma stack em mente, ou esta em aberto?

Com isso ja consigo montar o documento completo.
```

---

### 3. Gerar o arquivo .md

Com as informacoes suficientes, gere o arquivo em `.opencode/work/docs/project-brief-<nome-do-projeto>.md`.

Use o template abaixo. Para campos sem informacao: use `> _A definir_` como placeholder.

---

## Template do Project Brief

```markdown
# Project Brief — [Nome do Projeto]

> **Status:** Rascunho | **Data:** [DATA_HOJE] | **Autor:** [Autor se mencionado, senao deixar em branco]

---

## 1. Visao Geral

[2-3 frases: o que e, para quem, qual o diferencial]

---

## 2. Problema & Solucao

**Problema:**
[Descreva o problema de forma concreta. Formato: "Hoje, [usuario] precisa [fazer algo dificil/manual/caro], o que causa [consequencia negativa]."]

**Solucao:**
[Como o projeto resolve esse problema.]

---

## 3. Publico-Alvo

| Campo | Descricao |
|---|---|
| **Quem e** | [Persona principal] |
| **Contexto** | [Situacao/contexto de uso] |
| **Dor principal** | [Principal problema que enfrentam] |

---

## 4. Funcionalidades

### MVP (escopo inicial)
- [ ] [Funcionalidade 1]
- [ ] [Funcionalidade 2]
- [ ] [Funcionalidade 3]

### Futuro / Nice-to-have
- [Funcionalidade A]
- [Funcionalidade B]

---

## 5. Stack Tecnologica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | [tecnologia] | [motivo] |
| Backend | [tecnologia] | [motivo] |
| Banco de dados | [tecnologia] | [motivo] |
| Auth | [tecnologia] | [motivo] |
| Hospedagem | [tecnologia] | [motivo] |

---

## 6. Arquitetura de Alto Nivel

[Paragrafo ou esquema ASCII descrevendo o fluxo principal do sistema]

---

## 7. Integracoes Externas

| Servico | Finalidade |
|---|---|
| [Servico] | [Para que serve] |

---

## 8. Requisitos Nao-Funcionais

- **Escala esperada:** [usuarios/requisicoes estimados]
- **Disponibilidade:** [critico ou tolerante a downtime]
- **Seguranca / Compliance:** [dados sensiveis? LGPD? etc]
- **Performance:** [requisitos de tempo de resposta, etc]

---

## 9. Fora do Escopo

- ~~[O que nao vai ser feito agora]~~
- ~~[Outra coisa fora do escopo]~~

---

## 10. Referencias & Inspiracoes

| Referencia | O que aproveitar |
|---|---|
| [Produto/URL] | [Aspecto de referencia] |

---

## Notas & Decisoes em Aberto

- [ ] [Decisao tecnica pendente]
- [ ] [Questao a ser validada]
```

---

## Regras gerais

- **Nunca invente informacoes** que o usuario nao forneceu. Use `> _A definir_` para campos vazios.
- **Nao inclua secoes completamente vazias** — se nao ha nenhuma informacao para integracoes externas, por exemplo, coloque `> _Nenhuma identificada ate o momento._`
- **Seja fiel ao que o usuario disse** — nao "melhore" a ideia dele sem ser solicitado.
- **Tom do documento:** profissional mas direto. Sem jargao desnecessario.
- Apos gerar o arquivo, informe o usuario com o path completo: `.opencode/work/docs/project-brief-<nome>.md`
- Termine com uma mensagem curta perguntando se quer ajustar algo.
