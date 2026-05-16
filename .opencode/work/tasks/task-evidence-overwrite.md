# Task: task-evidence-overwrite — Remove timestamp from evidence file naming

## Status: READY_TO_COMMIT

## Metadata
- **Type:** chore
- **Scope:** infrastructure
- **Priority:** medium
- **Source:** Prompt ("quero apenas a opção 1, atualize isso no escopo...")

## Problem Statement
As skills de evidência (`test-logger`, `coverage-reporter`, `security-checker`) criam um novo arquivo com timestamp a cada rodada (`test-run-<issue>-<YYYYMMDD-HHMMSS>.md`). Isso acumula ruído — a sprint-1 tinha 12 arquivos de evidência quando só 3 importavam. Skills downstream (`pr-description`, `create-pr`, `code-reviewer`) usam `ls -t | head -1` para achar o último, adicionando complexidade desnecessária.

**Solução:** Remover timestamp do nome. Um arquivo fixo por tipo de evidência, sobrescrito a cada execução.

## Acceptance Criteria
- [x] `test-logger` escreve `test-run-<issue-num>.md` (sem timestamp) e sobrescreve
- [x] `coverage-reporter` escreve `coverage-<issue-num>.md` (sem timestamp) e sobrescreve
- [x] `security-checker` escreve `security-<issue-num>.md` (sem timestamp) e sobrescreve
- [x] `pr-description` referencia nome fixo em vez de `ls -t | head -1`
- [x] `create-pr` referencia nome fixo em vez de `ls -t | head -1`
- [x] `code-reviewer` atualiza paths de `*-<id>-<timestamp>.md` → `*-<id>.md`
- [x] `senior-engineer-executor` compatível com nova convenção

## Technical Approach
**Decision:** Substituição de strings nos SKILL.md — remover `<YYYYMMDD-HHMMSS>` / `<timestamp>` dos templates de nome de arquivo, remover lógica de `ls -t | head -1`, atualizar exemplos.
**Origin:** user-driven
**Rationale:** Evidência de sprint só precisa do estado mais recente. Histórico se necessário pode ser feito via git. Simplifica o workflow e reduz ruído no filesystem.

## Architecture Fit
Skills são metadados do workflow OpenCode. Nenhuma mudança em código de aplicação. Não afeta `PROJECT_CONTEXT.md`.

## Implementation Plan

### Tasks
- [x] Task 1: Atualizar `test-logger/SKILL.md` — remover timestamp do filename, atualizar exemplos
- [x] Task 2: Atualizar `coverage-reporter/SKILL.md` — remover timestamp do filename, atualizar exemplos
- [x] Task 3: Atualizar `security-checker/SKILL.md` — remover timestamp do filename, atualizar exemplos
- [x] Task 4: Atualizar `pr-description/SKILL.md` — trocar `ls -t | head -1` por referência fixa
- [x] Task 5: Atualizar `create-pr/SKILL.md` — trocar `ls -t | head -1` por referência fixa
- [x] Task 6: Atualizar `code-reviewer/SKILL.md` — paths de `*-<id>-<timestamp>.md` → `*-<id>.md`
- [x] Task 7: Atualizar `senior-engineer-executor/SKILL.md` — verificar referências a logs

### Implementation Order
1. Skills core (test-logger, coverage-reporter, security-checker) — são a fonte da convenção
2. Skills downstream (pr-description, create-pr, code-reviewer, senior-engineer-executor) — consomem a convenção

### Files to Create/Modify
| File | Action | Purpose |
|------|--------|---------|
| .opencode/skills/test-logger/SKILL.md | MODIFY | Remover timestamp, atualizar exemplos |
| .opencode/skills/coverage-reporter/SKILL.md | MODIFY | Remover timestamp, atualizar exemplos |
| .opencode/skills/security-checker/SKILL.md | MODIFY | Remover timestamp, atualizar exemplos |
| .opencode/skills/pr-description/SKILL.md | MODIFY | Remover `ls -t \| head -1`, referência fixa |
| .opencode/skills/create-pr/SKILL.md | MODIFY | Remover `ls -t \| head -1`, referência fixa |
| .opencode/skills/code-reviewer/SKILL.md | MODIFY | Atualizar paths nos exemplos |
| .opencode/skills/senior-engineer-executor/SKILL.md | MODIFY | Verificar compatibilidade |

## Testing Strategy
- **Verificação manual:** Após edição, verificar que cada SKILL.md não contém mais `YYYYMMDD`, `HHMMSS`, `<timestamp>` em nomes de arquivo de saída, nem `ls -t.*head -1`.

## Risks and Considerations
- Nenhum — são arquivos de instrução de agente, não código executável.

## Dependencies
- **External:** Nenhuma
- **Internal:** Nenhuma

## Evidence (filled by tester/reviewer)
- **Verification Log:** .opencode/work/logs/verify-evidence-overwrite.md
- **Test Log:** N/A (markdown-only task — no executable code)
- **Coverage:** N/A
- **Security Scan:** N/A
- **Review Verdict:** APPROVED
- **Reviewed by:** @reviewer
- **Review date:** 2026-05-16T19:00:00Z

---
*Created by @orchestrator-nontdd*
*Last updated: 2026-05-16T19:00:00Z — @reviewer*
