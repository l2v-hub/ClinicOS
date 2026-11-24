# Task Validation Report

## Task

- Title: Dimetti paziente nella scheda Dimissione
- Slug: dimetti-paziente-nella-scheda-dimissione
- Commit: `ffb0b3812` (PR l2v-hub/ClinicOS#556, unita in `main` come `2bcac921d`)
- Date: 2026-11-24

## Implementation Summary

- Scheda «Dimissione»: sezione «Stato del ricovero» con **Dimetti paziente** e **Annulla
  dimissione**, entrambe con conferma; visibili solo a chi ha il permesso.
- Server: `POST /patients/:id/discharge` mette la cartella in stato «dimesso», libera da oggi il
  posto letto del paziente e scrive la traccia `dimissioneRegistrata`, in una sola transazione.
  `POST /patients/:id/discharge/undo` riporta al regime precedente senza riassegnare il letto.
  Entrambe chiedono `confirmed: true`.
- Permesso nuovo `patients.discharge`: medico e infermiere sì; coordinatore, amministratore e OSS no
  (decisione dell'utente del 2026-11-24).
- `saveCartella`: lo stato «dimesso» si mette e si toglie solo con i due comandi; un salvataggio
  della cartella da una copia letta prima non annulla la dimissione (difetto trovato dalla revisione
  indipendente del codice prima dell'unione, corretto nella stessa PR).
- Correzione collegata: la chiusura di un'assegnazione dal cambio camera non ignora più il rifiuto
  del server.
- Nessuna modifica allo schema Prisma.

## Files Changed

- Server: `backend/src/patients/discharge.ts` (nuovo), `backend/src/patients/cartella-update.ts`,
  `backend/src/routes/patients.ts`, `backend/src/authz/baseline.ts`,
  `backend/src/authz/capability-registry.json`,
  `backend/src/patients/__tests__/discharge.e2e.test.ts` (nuovo).
- Frontend: `frontend/src/lib/patientDischarge.ts` (nuovo) e le sue prove,
  `frontend/src/components/operator/cartella/DimissioneTab.tsx`,
  `frontend/src/components/operator/PatientDetail.tsx`, `frontend/src/App.tsx`,
  `frontend/src/types.ts`, `frontend/src/app-additions.css`.
- Catalogo e documenti: `.ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.{json,md}`,
  `.ai-architecture/phase-2-authorization/ROLE_CAPABILITY_MATRIX.json`,
  `docs/product/dimissione-paziente.md`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                  |
| --- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | demo: `screenshots/demo/03-presente-con-letto.png`, `04-conferma.png` (conferma con «Camera 10 · Letto A»); in locale anche il medico (`screenshots/local/09-medico-dimesso.png`)                                          |
| AC2 |   PASS | demo, `logs/demo-verify-2026-11-24.log` punti 4–7: una sola scrittura `POST …/discharge`, stato «dimesso», 0 assegnazioni attive, letto libero per il coordinatore, fuori da «Non dimessi» e dentro «Dimessi e archivio» in una sessione nuova |
| AC3 |   PASS | prove del server 1, 3, 4 (transazione unica, ripetizione senza effetti); demo punto 8: ripetizione → `alreadyDischarged: true`                                                                                            |
| AC4 |   PASS | demo punto 3: coordinatore, amministratore e OSS → 403; senza conferma → 400; stato invariato. Prove del server 2 e 5 (anche paziente fuori ambito → 404)                                                                 |
| AC5 |   PASS | demo punti 2 e 6: «Annulla dimissione» riporta tra i presenti; un salvataggio da copia precedente lascia lo stato «dimesso». Prove del server 6 e 7                                                                       |
| AC6 |   PASS | `logs/local-validation.md`: 8 prove del server, suite frontend 1637/1637, nessun file del server fallito in più rispetto a `main`, build riuscite; CI della PR verde (gate, frontend-tests, browser-e2e, secret-scan)       |
| AC7 |   PASS | demo, sul paziente di prova «Prova Milo»: `logs/demo-verify-2026-11-24.log`, `screenshots/demo/*.png`                                                                                                                     |

## Test Results

| Test             | Result | Evidence                                                                                                  |
| ---------------- | -----: | --------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | `frontend/src/lib/__tests__/patientDischarge.test.ts` (4); suite frontend 1637/1637                       |
| Integration      |   PASS | `backend/src/patients/__tests__/discharge.e2e.test.ts` (8): stato e letto nella stessa transazione        |
| API              |   PASS | ruoli ammessi e negati, conferma obbligatoria, ripetizione, ambito — in locale e sulla demo               |
| Playwright       |   PASS | giro nel browser in locale (`screenshots/local/`) e sulla demo (`screenshots/demo/`)                      |
| Persistence      |   PASS | demo punto 7: lo stato resta in una sessione nuova                                                        |
| Agnos AI         |     NA |                                                                                                           |
| Voice            |     NA |                                                                                                           |
| OCR              |     NA |                                                                                                           |
| Security/privacy |   PASS | rotte censite nel catalogo (nessun `capability_unmapped`), 403 ai ruoli non ammessi, secret-scan della CI |

## Runtime Evidence

Demo `https://clinicos-eosin.vercel.app`: server Railway rilascio `4be99e3d` dal commit
`2bcac921d` (SUCCESS, `/health` ok), frontend Vercel `clinicos-l4uhppkom` (bundle
`index-DV20ljTw.js`). Configurazione dei permessi attiva sulla demo: iniziale (versione 0), quindi il
permesso nuovo vale senza altri passi.

Dati toccati sulla demo: solo il paziente di prova «Prova Milo». Per provare il letto il coordinatore
gli ha assegnato Camera 10 · Letto A da ieri; la dimissione l'ha chiusa a ieri e il letto è di nuovo
libero. Stato finale: «Prova Milo» dimesso, senza letto (come richiesto in precedenza dall'utente).

Limiti noti, fuori da questa modifica: il coordinatore può ancora assegnare un letto a un paziente
dimesso; un'uscita temporanea aperta resta aperta alla dimissione; un sito con una configurazione
dei permessi salvata deve concedere il permesso nuovo da «Ruoli e permessi». Il sito di sviluppo
isolato non è stato rilasciato né toccato.

## Logs

Only sanitized logs are allowed. `logs/demo-verify-2026-11-24.log` e `logs/local-validation.md`:
nessun segreto, solo esiti e dati del paziente di prova sintetico. Gli «errori» in coda al log della
demo sono le risposte 400/403 provocate apposta dalle prove di rifiuto.

## Final Decision

CLOSED — VERIFIED
