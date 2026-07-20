# Task Validation Report

## Task
- Title: issue 280 import terapia form reale
- Slug: issue-280-import-terapia-form-reale
- GitHub Issue: #280
- Commit: (SHA riportato nel commento issue al push)
- Date: 2026-07-20

## Implementation Summary

DischargeTherapyReview renderizza per ogni terapia rilevata il form REALE della creazione manuale (TherapyFormFields) precompilato dal bridge dischargeRowToTherapyForm, con il testo originale del documento accanto; le modifiche rientrano nella riga raw via therapyFormToDischargeRow e arrivano alla conferma (dischargeRowToTherapyInput invariato).

## Files Changed

- frontend/src/components/shared/intake/DischargeTherapyReview.tsx
- frontend/src/components/shared/intake/dischargeTherapy.ts (bridge #280)
- frontend/src/app-additions.css (stili review)

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 form reale precompilato (prodotto, forma, dosaggio, via, orari) | PASS | screenshots/280-form-reale-precompilato.png + assert valori |
| AC2 testo originale visibile accanto al form | PASS | assert data-testid discharge-original-text |
| AC3 modifica (08:00 -> 09:30) sopravvive alla conferma | PASS | GET /patients/:id/therapies con schedule 09:30, non 08:00 |
| AC4 righe 'da verificare' segnalate e mai perse | PASS | assert badge + data-stato su riga Furosemide |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Playwright | PASS | qa-evidence/tests/issue-280.spec.ts (1 passed, 12.8s) |
| Persistence | PASS | paziente in lista dopo reload + terapia via API |
| OCR/import | PASS | draft seedato con terapiaImport (provider AI mock = estrazione vuota) |

## Runtime Evidence

- Screenshot: screenshots/280-form-reale-precompilato.png, screenshots/280-paziente-creato.png
- Trace: artifacts/task-validation/issue-280-import-terapia-form-reale/trace/
- Playwright report: artifacts/task-validation/issue-280-import-terapia-form-reale/playwright-report/
- Test results (raw): artifacts/task-validation/issue-280-import-terapia-form-reale/test-results/
- Video: artifacts/task-validation/issue-280-import-terapia-form-reale/video/

## Logs

Nessun PHI: fixture sintetiche (Amoxicillina/Furosemide, paziente Import280-ts).

## Residual Risks

Round-trip lossy mitigato con stato form locale a piena fedelta'; residuo non mappabile in note.

## Final Decision

CLOSED — VERIFIED
