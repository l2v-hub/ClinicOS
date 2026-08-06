# Task Contract

## Task
- Title: Loop UX ciclo 3: rimuovi step placeholder Documenti dal wizard nuovo paziente
- Slug: loop-ux-ciclo-3-rimuovi-step-placeholder-documenti-dal-wizard-nuovo-paziente
- Type: refactor
- Date: 2026-08-06

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Il wizard "Nuovo paziente" (`IntakeWorkspace.tsx`) ha 6 step: Anagrafica, Ingresso, Clinica,
Moduli, Documenti, Verifica. Lo step 5 "Documenti" è un puro placeholder — un'unica riga di testo
"Importa documenti / Scatta foto — in arrivo (F5)" — senza alcun contenuto interattivo. Ogni
creazione paziente (reale o via import IA) costringe l'operatore a un click "Avanti" in più per
attraversare uno step che non fa nulla.

## Expected Behaviour

Il wizard passa da 6 a 5 step: Anagrafica, Ingresso, Clinica, Moduli, Verifica. Lo step "Documenti"
va reintrodotto quando la funzionalità (F5, import documenti/foto) sarà implementata — non prima.
Nessuna perdita di funzionalità: lo step rimosso non raccoglieva né mostrava alcun dato.

## Acceptance Criteria

- AC1: `STEPS` in `IntakeWorkspace.tsx` ha 5 voci, "Documenti" rimosso.
- AC2: il blocco placeholder dello step "Documenti" è rimosso; lo step "Verifica" (ex step 6)
  diventa step 5, incluso il suo `data-testid` (`intake-step-5`, non più `intake-step-6`).
- AC3: `e2e/import-happy-path.mjs` (l'unico script di questo tipo effettivamente eseguito in CI,
  job `browser-e2e`) aggiornato di conseguenza — un click "Avanti" in meno, testid rinumerati.
- AC4: verificato dal vivo che il wizard mostra l'indicatore a 5 step (non 6) e che dopo "Moduli"
  si arriva direttamente a "Verifica".
- AC5: `tsc --noEmit`, `npm run build`, `npm test` puliti su frontend.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | `npm test` non deve regredire. |
| Integration | no | |
| API | no | Nessuna route backend toccata. |
| Playwright | yes | Unico modo per confermare visivamente l'indicatore a 5 step e l'assenza di regressioni nel flusso. |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

## Evidence Plan

Required evidence:

- validation-report.md
- output build (`tsc --noEmit`, `npm run build`, `npm test`)
- screenshot dell'indicatore di step del wizard (5 step, "Documenti" assente)

## Risks

- Altri script Playwright storici (non eseguiti in CI: `agent-team/tests/`,
  `e2e/remediation/issue-243.spec.ts`, `qa-evidence/tests/issue-{281,282,294}.spec.ts`,
  `artifacts/task-validation/294-qa-gate-pr295/qa294-diagnostic.spec.ts`) referenziano ancora
  `intake-step-5`/`intake-step-6` con la numerazione precedente — lasciati intatti perché non
  collegati a nessun workflow CI (verificato via grep sui workflow) e quindi non bloccanti; sono
  fotografie di verifiche passate, non test che girano oggi.
- Quando F5 (import documenti/foto) verrà implementato, andrà reinserito come nuovo step esplicito
  (probabilmente tra Moduli e Verifica, la sua posizione originale) — non un semplice "un-revert"
  di questo commit, perché nel frattempo Verifica avrà cambiato indice.

## Gate Status

READY FOR IMPLEMENTATION
