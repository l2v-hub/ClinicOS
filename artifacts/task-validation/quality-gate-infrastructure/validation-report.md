# Task Validation Report

## Task
- Title: Quality Gate infrastructure
- Slug: quality-gate-infrastructure
- Commit: (vedi commit di questo report)
- Date: 2026-07-05

## Implementation Summary

Creata l'infrastruttura obbligatoria Quality Gate / Agent Loop (Node puro, nessuna dipendenza):
Task Contract prima di modificare codice, Validation Report + Final Decision prima di dichiarare
"done". Skill auto-attivante, 2 hook di enforcement, 3 script CLI + lib condivisa, docs con limiti,
regola in CLAUDE.md, npm scripts. NESSUNA feature applicativa toccata.

## Files Changed

- `CLAUDE.md` (regola Quality Gate in testa)
- `.claude/settings.json` (wiring hooks PreToolUse + Stop)
- `.claude/skills/agent-loop-quality-gate/SKILL.md`
- `.claude/hooks/quality-gate-preflight.js`
- `.claude/hooks/quality-gate-closure.js`
- `scripts/quality-gate/lib.js`
- `scripts/quality-gate/create-task-contract.js`
- `scripts/quality-gate/validate-task-contract.js`
- `scripts/quality-gate/check-closure.js`
- `docs/quality-gate.md`
- `package.json` (script quality-gate:start|validate|check-closure)

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 — create-task-contract genera contract + sottocartelle + scheletro report, no overwrite senza --force | PASS | contract+report+screenshots/video/trace/logs/test-results creati; secondo run senza --force → exit 2 |
| AC2 — validate-task-contract fallisce se manca una sezione obbligatoria | PASS | contract 'broken' → "sezioni mancanti" rc=1; contract completo → CONTRACT VALIDO rc=0 |
| AC3 — check-closure consente "done" solo con CLOSED — VERIFIED | PASS | IMPLEMENTED — NOT VERIFIED → rc=2; CLOSED — VERIFIED → rc=0 |
| AC4 — preflight blocca codice applicativo senza contract, consente infra/letture | PASS | Write backend/src/x.ts senza contract → rc=2; con contract → rc=0; artifacts/ → rc=0 |
| AC5 — closure blocca parole di completamento senza report verificato | PASS | '{"assistant_message":"Task done and fixed."}' → rc=2 |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | NA | script CLI testati via esecuzione diretta |
| Integration | PASS | flusso create→validate→check-closure + 2 hook, 8 path verificati |
| API | NA | infra locale, nessuna API |
| Playwright | NA | nessuna UI |
| Persistence | NA | nessun dato applicativo |
| Agnos AI | NA | non toccato |
| Voice | NA | non toccato |
| OCR | NA | non toccato |
| Security/privacy | PASS | hook fail-open; nessun secret introdotto/loggato |

## Runtime Evidence

- `node -c` su tutti gli script/hook → OK; `package.json` + `settings.json` JSON validi.
- create → `task-contract.md` + `validation-report.md` + sottocartelle evidenze.
- validate: CONTRACT VALIDO (rc0) / sezioni mancanti (rc1).
- check-closure: CLOSED — VERIFIED (rc0) / IMPLEMENTED — NOT VERIFIED (rc2).
- preflight: backend senza contract (rc2) / con contract (rc0) / artifacts (rc0).
- closure: "done" senza report verificato (rc2).

## Logs

Only sanitized logs. Nessun secret negli hook/script.

## Residual Risks

Enforcement parziale degli hook Claude Code (associazione per-task grossolana; testo finale non
riscrivibile; fail-open; bypass da strumenti esterni). Documentati in `docs/quality-gate.md`.

## Final Decision

CLOSED — VERIFIED
