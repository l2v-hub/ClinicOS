# Task Contract

## Task

- Title: Intake: referente e indirizzo completo arrivano in cartella
- Slug: intake-referente-e-indirizzo-completo-arrivano-in-cartella
- Type: bugfix
- Date: 2026-09-27

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |       no |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

- **Database/Persistence:** cambia cosa viene inviato a `POST /intake/drafts/:id/confirm`
  (colonne esistenti `Patient.address`, `emergencyContactName`, `emergencyContactPhone` e il JSON
  della cartella). Nessuna modifica a schema o backend.
- **OCR/Import:** il referente estratto dalle lettere passa dallo stesso wizard e oggi si perde.

## Current Behaviour

- `StepAnagrafica` scrive `address`, `comune`, `provincia`, `cap`, `referenteNome`,
  `referenteRelazione`, `referenteTelefono` e `emergencyContact` in `data.anagrafica`.
- L'import (`importReviewModel`) precompila `referenteNome` e `referenteTelefono` dai dati
  estratti.
- `IntakeWorkspace.handleConfirm` invia invece:
  - `emergencyContactName` / `emergencyContactPhone`, che il wizard non valorizza mai;
  - `address` senza comune, provincia e CAP.
- Risultato:
  - il referente (nome, telefono, relazione) si perde, anche quello letto dalle lettere;
  - dell'indirizzo resta solo la via;
  - l'eventuale contatto di emergenza diverso dal referente si perde.
- La cartella non mostra il referente in nessuna vista, quindi la perdita non è visibile.

## Expected Behaviour

- **Alla conferma:**
  - il referente va in `Patient.emergencyContactName` / `emergencyContactPhone`;
  - la relazione va in `cartella.contattoEmergenzaRel`;
  - un contatto di emergenza diverso dal referente va in `cartella.contattoEmergenzaAltro`;
  - l'indirizzo completo (via, CAP, comune, provincia) va in `Patient.address`.
- **Il tab Contatti** mostra il referente (nome, relazione, telefono) e l'altro contatto di
  emergenza, se presente.
- **Nulla viene inventato:** i campi vuoti non vengono inviati.

## Acceptance Criteria

- AC1: `buildIntakeContacts` compone l'indirizzo "Via, CAP Comune (PR)" con le sole parti
  presenti e restituisce `undefined` se non c'è nulla.
- AC2: `buildIntakeContacts` mappa referenteNome/Telefono → emergencyContactName/Phone,
  referenteRelazione → contattoEmergenzaRel, emergencyContact → contattoEmergenzaAltro, e non
  emette chiavi per campi vuoti.
- AC3: il payload di `handleConfirm` usa questo mapping. Test di contratto sul sorgente, più il
  payload reale intercettato nel browser.
- AC4: nel browser il tab Contatti di un paziente con referente mostra nome, relazione e telefono.
  Senza referente mostra "Non indicato" e nessun dato inventato.
- AC5: `npm run build` passa; nessun nuovo test fallito rispetto alla baseline di origin/main.

## Test Plan

| Test type                 | Required | Reason                                                                                   |
| ------------------------- | -------: | ---------------------------------------------------------------------------------------- |
| Unit                      |      yes | mapping puro contatti (casi completo, parziale, vuoto)                                   |
| Integration               |       no | backend invariato                                                                        |
| API                       |       no | endpoint invariati; payload verificato nel browser                                       |
| Playwright                |      yes | conferma dal wizard (payload intercettato) e tab Contatti con stub                       |
| Persistence after refresh |       no | nessun Postgres locale; colonne backend già esistenti e già accettate da confirm-service |
| Agnos action registry     |       no |                                                                                          |
| Voice simulation          |       no |                                                                                          |
| OCR/import test           |       no | l'import scrive gli stessi campi del wizard: coperto dal mapping                         |
| Security/privacy scan     |       no | solo dati sintetici                                                                      |

## Evidence Plan

Required evidence:

- validation-report.md
- test-results/unit-contacts.txt, test-results/build.txt, test-results/unit-full.txt
- logs/playwright-evidence.txt (payload di conferma intercettato: solo nomi dei campi)
- screenshots del tab Contatti

## Risks

- **Pazienti già creati:** i dati persi non sono recuperabili dal database. Restano nella bozza di
  intake conservata (`PatientIntakeDraft`); il recupero è fuori scope e va segnalato.
- **Indirizzo in un solo campo:** diventa una stringa unica. `Patient` ha una sola colonna
  `address`, e aggiungerne altre richiederebbe una modifica allo schema, fuori scope.

## Gate Status

READY FOR IMPLEMENTATION
