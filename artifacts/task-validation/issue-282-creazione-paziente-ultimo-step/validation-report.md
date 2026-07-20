# Task Validation Report

## Task
- Title: issue 282 creazione paziente ultimo step
- Slug: issue-282-creazione-paziente-ultimo-step
- GitHub Issue: #282
- Commit: (SHA riportato nel commento issue al push)
- Date: 2026-07-20

## Implementation Summary

La conferma revisione terapia e' sbloccabile anche nello step finale (checkbox data-testid accept-therapy-verifica in StepVerifica): il bottone 'Crea paziente' non resta mai disabilitato senza un controllo per rimediare; a gate completo crea davvero il paziente.

## Files Changed

- frontend/src/components/shared/intake/StepVerifica.tsx

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 checkbox conferma terapia presente allo step finale | PASS | assert visibilita' + label 'nessuna terapia da inserire' |
| AC2 bottone abilitato dopo le conferme e POST confirm 201 | PASS | waitForResponse /confirm con 201 |
| AC3 paziente persistente dopo reload | PASS | assert cognome in lista dopo reload |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Playwright | PASS | qa-evidence/tests/issue-282.spec.ts (1 passed, 9.3s) |
| Persistence | PASS | reload + lista pazienti |

## Runtime Evidence

- Screenshot: screenshots/282-step-finale-sbloccato.png, screenshots/282-paziente-in-lista.png
- Trace: artifacts/task-validation/issue-282-creazione-paziente-ultimo-step/trace/
- Playwright report: artifacts/task-validation/issue-282-creazione-paziente-ultimo-step/playwright-report/
- Test results (raw): artifacts/task-validation/issue-282-creazione-paziente-ultimo-step/test-results/
- Video: artifacts/task-validation/issue-282-creazione-paziente-ultimo-step/video/

## Logs

Paziente sintetico Creazione282-ts.

## Residual Risks

_accepted resta l'unico gate: la checkbox duplicata scrive lo stesso campo del draft.

## Final Decision

CLOSED — VERIFIED
