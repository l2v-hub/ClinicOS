---
name: agent-loop-quality-gate
description: Obbligatoria per QUALSIASI task che impatti frontend, backend, database, API, Agnos AI/chatbot, voice, OCR/importazione, provider LLM, Railway/Azure/env config, privacy/security, bug, feature o refactoring. Impone Task Contract prima di modificare codice e Validation Report con decisione finale basata sui test prima di dichiarare completato.
---

# Agent Loop — Quality Gate

Nessun task di sviluppo parte senza **Task Contract**. Nessun task è "done" senza **Validation Report**
con `Final Decision: CLOSED — VERIFIED`. Questa skill si attiva automaticamente quando la richiesta
impatta uno qualunque di: frontend, backend, database, API, Agnos AI/chatbot, voice, OCR/import,
provider LLM, Railway/Azure/env config, privacy/security, bug, feature, refactoring.

## Il loop obbligatorio

```
Task request
→ Task Contract        (artifacts/task-validation/<slug>/task-contract.md)
→ Impact Classification
→ Acceptance Criteria
→ Test Plan
→ Implementation
→ Runtime Validation
→ Evidence
→ Validation Report    (artifacts/task-validation/<slug>/validation-report.md)
→ Final Decision       (basata sui test)
```

## Passi (crea un todo per ciascuno)

1. **Task Contract** — genera il contract:
   `node scripts/quality-gate/create-task-contract.js "<titolo>" [--type feature|bugfix|refactor|config]`
2. **Impact Classification** — compila la tabella aree (yes/no) nel contract.
3. **Acceptance Criteria** — AC verificabili e non ambigui.
4. **Test Plan** — segna i test richiesti (unit/integration/API/Playwright/persistence/Agnos/voice/OCR/security) con motivazione.
5. **Evidence Plan** — quali evidenze produrrai (screenshot, trace, log sanitizzati, output test, prova di persistenza).
6. **Valida il contract** prima di toccare codice:
   `node scripts/quality-gate/validate-task-contract.js <slug>` → deve stampare `CONTRACT VALIDO`.
7. **Implementation** — modifiche chirurgiche e coerenti coi pattern esistenti.
8. **Runtime Validation** — esegui i test del piano; cattura le evidenze nelle sottocartelle
   `screenshots/ video/ trace/ logs/ test-results/`.
9. **Validation Report** — scrivi `validation-report.md` con la tabella AC (PASS/FAIL) e i risultati test.
10. **Final Decision** — esattamente una tra:
    `CLOSED — VERIFIED` · `IMPLEMENTED — NOT VERIFIED` · `FAILED VALIDATION` · `BLOCKED` · `PARTIAL`.
    Verifica: `node scripts/quality-gate/check-closure.js <slug>` — solo `CLOSED — VERIFIED` consente "done".

## Regole dure

- **Mai** modificare codice applicativo (frontend/, backend/, clinicos-ai-runtime/, prisma/, env/config)
  senza un `task-contract.md` valido. L'hook `quality-gate-preflight.js` lo blocca.
- **Mai** dichiarare done/fatto/completato/fixed/risolto/chiuso/closed senza
  `validation-report.md` con `CLOSED — VERIFIED`. In assenza, lo stato è
  `IMPLEMENTED — NOT VERIFIED` (o `FAILED VALIDATION`/`BLOCKED`/`PARTIAL`). L'hook `quality-gate-closure.js` lo blocca.
- La decisione finale deriva dai **test eseguiti**, non da impressioni.
- Log solo **sanitizzati** (PHI-safe): nomi campo, mai valori clinici; mai secret.

## Esenzioni

Non richiedono contract: sola lettura, ricerca, `git status`, `ls`, `grep`, e la creazione/aggiornamento
del Task Contract o dell'infrastruttura quality gate stessa. Vedi `docs/quality-gate.md` per dettagli e limiti.

Integrazione: complementare a `docs/validation-method.md` (tipi di evidenza per Frontend/Backend/Agnos/Sicurezza).
