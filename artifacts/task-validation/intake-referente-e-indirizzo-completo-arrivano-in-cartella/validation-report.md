# Task Validation Report

## Task

- Title: Intake: referente e indirizzo completo arrivano in cartella
- Slug: intake-referente-e-indirizzo-completo-arrivano-in-cartella
- Commit: (vedi PR)
- Date: 2026-09-27

## Implementation Summary

- **Nuovo modulo puro `frontend/src/lib/intakeContacts.ts`:**
  - `composeAddress` compone "Via, CAP Comune (PR)" con le sole parti presenti.
  - `buildIntakeContacts` mappa:
    - referente nome/telefono → `Patient.emergencyContactName/Phone`;
    - indirizzo composto → `Patient.address`;
    - relazione (codice del wizard) → etichetta in `cartella.contattoEmergenzaRel`;
    - contatto di emergenza diverso → `cartella.contattoEmergenzaAltro`.
  - I campi vuoti non vengono inviati.
  - **Fonte unica:** indirizzo e referente vivono solo nelle colonne del paziente, le stesse
    aggiornate da comandi vocali e `PATCH /patients/:id`. In cartella va solo ciò che il
    paziente non ha.
- **`IntakeWorkspace.handleConfirm`:** usa il mapping. `emergencyContactName/Phone` delle bozze
  vecchie restano come ripiego.
- **`App.selectPaziente`:** il paziente aperto dalla lista è un riepilogo senza indirizzo e
  referente (`identity-page.ts`). Una lettura mirata `GET /patients/:id` in background lo
  completa, protetta dalla sequenza di navigazione.
- **`PatientDetail`, tab Contatti:**
  - nuove righe "Referente" (nome · relazione), "Telefono referente" e "Altro contatto di
    emergenza";
  - il referente si legge prima dal paziente, poi dalla copia in cartella delle importazioni
    legacy.
- **`types.ts`:** `Paziente.emergencyContactName/Phone`, `CartellaPaziente.contattoEmergenzaAltro`.

## QA round 1 (FAILED VALIDATION) → correzioni

1. **La copia in cartella nascondeva le modifiche successive fatte a voce o via PATCH.**
   **Corretto:** fonte unica nelle colonne del paziente, lettura del paziente completo alla
   scheda, precedenza al paziente nel tab. Lo prova lo scenario C: cartella con referente vecchio
   e paziente aggiornato, si vede quello aggiornato.
2. **Il report era chiuso prima del QA.** Ora la decisione resta in attesa della certificazione.
3. **Lo scenario C mostra solo la visualizzazione.** Dichiarato: l'output del wizard (W) e la
   visualizzazione (C) sono provati separatamente, perché senza database non c'è persistenza fra i
   due.

## Files Changed

- frontend/src/lib/intakeContacts.ts (nuovo)
- frontend/src/lib/**tests**/intakeContacts.test.ts (nuovo)
- frontend/src/components/shared/intake/IntakeWorkspace.tsx
- frontend/src/components/operator/PatientDetail.tsx
- frontend/src/App.tsx
- frontend/src/components/operator/PatientRecordPrintDocument.tsx
- frontend/src/types.ts

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                              |
| --- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | test-results/unit-contacts.txt — "composes the full address…", "address keeps only the parts…"                                                                                                        |
| AC2 |   PASS | unit-contacts.txt — "the referente reaches the patient columns and the cartella…", "nothing filled means nothing sent", "an unknown relation code is kept as written"                                 |
| AC3 |   PASS | unit-contacts.txt — "intake confirmation sends the mapped contacts (source contract)"; logs/playwright-evidence.txt W (payload reale del wizard intercettato, 6 PASS); logs/confirm-payload-keys.json |
| AC4 |   PASS | logs/playwright-evidence.txt C e N; screenshots/C-contatti-con-referente.png, N-contatti-senza-referente.png                                                                                          |
| AC5 |   PASS | test-results/build.txt exit 0; unit-full.txt 800/809, stessi 9 fallimenti della baseline di origin/main                                                                                               |

## Test Results

| Test             | Result | Evidence                                                                                                            |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | unit-contacts.txt 6/6; unit-full.txt 800/809 (9 preesistenti, identici alla baseline)                               |
| Integration      |     NA | backend invariato                                                                                                   |
| API              |     NA | endpoint invariati; il backend accetta già address/emergencyContactName/Phone (confirm-service.ts)                  |
| Playwright       |   PASS | evidence.mjs → logs/playwright-evidence.txt 13/13. Wizard vero su preview, bozza e conferma simulate con page.route |
| Persistence      |     NA | nessun Postgres locale                                                                                              |
| Agnos AI         |     NA |                                                                                                                     |
| Voice | NA | nessun test vocale; i comandi vocali scrivono `Patient.address/emergencyContact*`, cioè le stesse colonne che il tab Contatti ora legge per prime (scenario C) |
| OCR              |     NA | l'import scrive gli stessi campi del wizard (importReviewModel → referenteNome/Telefono), coperti dal mapping       |
| Security/privacy |     NA | dati sintetici                                                                                                      |

## Runtime Evidence

- screenshots/W1-anagrafica-compilata.png
- screenshots/W2-verifica.png
- screenshots/C-contatti-con-referente.png
- screenshots/N-contatti-senza-referente.png

## Logs

Only sanitized logs are allowed. confirm-payload-keys.json contiene solo i nomi dei campi.

## Residual Risks

- **Pazienti già creati:** referente e parti di indirizzo persi non si recuperano automaticamente.
  Restano nella bozza di intake conservata (`PatientIntakeDraft.data.anagrafica`); il recupero
  richiede un task dedicato.
- **Indirizzo in un solo campo:** diventa una stringa unica (`Patient` ha una sola colonna
  `address`).
- **Stampa scheda:** corretta in questo task. `PatientRecordPrintDocument` usava solo
  `cartella.indirizzo`; ora usa la stessa precedenza del tab Contatti (cartella, poi
  `Patient.address`), così un paziente creato dall'intake stampa il suo indirizzo.
- **Precedenza dell'indirizzo (preesistente, invariata):** il modulo profilo salva l'indirizzo solo
  in cartella e il tab lo legge per primo. Dopo una modifica manuale lì, una modifica vocale
  successiva dell'indirizzo resta nascosta. È fuori scope; va unificato con un task dedicato.
- **Fusione in background:** in teoria può sovrascrivere un salvataggio del profilo fatto negli
  istanti prima della risposta (stesso paziente). Rischio minimo: la lettura parte all'apertura
  della scheda.
- **Nessun end-to-end:** W e C sono provati separatamente (nessun Postgres locale).

## QA

QA indipendente: FAILED VALIDATION al round 1 (copia in cartella che nasconde modifiche
successive), READY FOR QA al round 2, confermato al round 3 dopo la correzione della stampa (con
test del ripiego in `patientRecordPrint.test.ts`, 5/5).

## Final Decision

CLOSED — VERIFIED
