# Task Validation Report

## Task
- Title: 445 turno infermiere somministra sul posto
- Slug: 445-turno-infermiere-somministra-sul-posto
- Issue: #445 (epic #455)
- Commit: branch `ux3/445-turno-somministra` (hash nel commit che contiene questo report)
- Date: 2026-10-12

## Implementation Summary

- **Da somministrare**: la coda del Turno raggruppa per orario e poi per paziente. C'è un blocco per
  paziente e fascia, con nome e posto letto una sola volta, l'elenco dei farmaci, le allergie e un
  solo «Somministra N». L'orario fa da intestazione: «08:00 non registrata da 15 ore».
- **Somministra N** apre sul posto `TurnoDosePanel`, come deciso dal responsabile il 12/10/2026:
  - ogni dose è visibile e spuntata;
  - «···» registra la mancata somministrazione con gli stessi motivi del giro (`MOTIVI`);
  - «Conferma» registra le dosi una alla volta con `recordAdministration`, cioè
    `POST /therapy-slots/confirm` e `/not-administered`, con la sola chiave dello slot e
    `confirmed: true`;
  - le dosi a scala glicemica non sono mai incluse e rimandano alla terapia;
  - un errore resta sulla riga e non annulla le altre dosi.
- **Ritardi** (`durataUmana`): minuti fino a 90, poi ore, poi giorni.
- **Allergie** (`useTurnoAllergies`): una richiesta a `/patients/clinical-summary` per i soli
  pazienti in coda. Lo stato è sempre esplicito: in verifica, non disponibili, allergeni in rosso,
  oppure «Nessuna allergia registrata».
- **In alto**: i 5 contatori (`OperatorClinicalKpiBand`, rimosso), la nota «Non dimessi: …» e
  «Chiudi tutte le sezioni» sono sostituiti da chip d'azione (`TurnoActionChips` /
  `lib/turnoChips.ts`): urgenze da prendere in carico, parametri critici, farmaci da far verificare.
  Compaiono solo se diversi da zero; un dato non arrivato si dice. Il numero di pazienti non dimessi
  resta nel sottotitolo.
- **La coda non ripete** urgenze e farmaci da verificare: stanno nelle chip e nella colonna
  «Da leggere».
- **Da leggere** (ex «Ultime consegne», senza la riga esplicativa) ha «Ho capito» sul posto per le
  urgenze di un collega, con lo stesso `acknowledgeConsegna` di App (`POST /consegne/:id/ack`).
- **Ruoli**: «Somministra» solo con la capability `administration.confirm`. Il medico vede i blocchi
  in sola lettura; OSS e supervisore non cambiano.

## Correzioni dopo il QA indipendente (FAILED VALIDATION sul primo commit)

1. **Bloccante, sicurezza clinica.** Dopo un «Conferma» fallito solo in parte, «Annulla» e la
   riapertura riproponevano la dose già registrata come rifiutata, spuntata come «Somministrata»;
   il server l'avrebbe sovrascritta in `erogata`. Ora ogni dose scritta esce subito dalla coda
   (`recorded` in `AdessoQueue`) e la coda si rilegge a ogni scrittura riuscita (`onRecorded`),
   anche se altre dosi falliscono. Regressione E2E: `scripts/e2e/issue-445-partial-failure.mjs`
   (R1–R4 PASS, `test-results/partial-failure.json`, `screenshots/qa-0*.png`).
2. Il raggruppamento usa anche l'orario esatto: dosi delle 06:00 e delle 08:00 della stessa fascia
   sono blocchi distinti, ognuno con la propria intestazione.
3. Una dose tolta dalla spunta dice «Esclusa: non viene registrata» e non offre «···».
4. Se gli allergeni sono più dei 10 nomi mandati dal server, il blocco aggiunge «+N altre».
5. Guardia sincrona (`useRef`) contro un secondo «Conferma» nello stesso istante.

### Secondo passaggio QA (FAILED VALIDATION su d86722663)

6. **Bloccante.** Se il server scrive il rifiuto ma la risposta si perde (rete, 5xx dopo il commit),
   nessuna dose risultava riuscita e la riapertura riproponeva il rifiuto come «Somministrata».
   Ora:
   - ogni dose tentata, riuscita o no, resta «in verifica» nella coda: visibile, ma fuori dal
     conteggio e dal pannello;
   - torna disponibile solo quando arriva una lettura di `/therapy-slots` **partita dopo** il
     tentativo (`revisione`/`revisioneLetta` in `useRiepilogoSomministrazioni`;
     `recordAdministration` invalida già le letture in volo; la revisione si legge da un ref, così un
     refresh automatico partito durante le scritture non conta);
   - è il server a dire se la dose è ancora da fare;
   - nel pannello una dose fallita non si riprova;
   - senza risposta il messaggio dice «esito incerto», non «non registrata»;
   - il motivo scelto vive nella coda, quindi un rifiuto non scritto torna ancora rifiutato.
7. Lo script E2E aspetta davvero il selettore dei ruoli dopo il reload (`isVisible` non attende).
8. Trovato nella prova dei ruoli: la chip «urgenze da prendere in carico» contava anche le urgenze
   scritte da chi legge (totale `urgentActive` del server). Ora conta solo
   `countToTakeCharge(urgentPreview)`, e scrive «Almeno N» quando l'anteprima del server è troncata.

### Terzo passaggio QA (FAILED VALIDATION su 36ff38534)

9. **Bloccante, introdotto dal passaggio precedente.** Il pannello aperto fissava le righe: se un
   collega registrava una dose dal giro e la coda si rileggeva, il pannello la mostrava ancora
   spuntata e «Conferma» sovrascriveva il suo rifiuto. Ora restano fisse solo le righe già tentate
   in questo pannello. Ogni altra dose si invia solo se la coda viva la dà ancora da fare;
   altrimenti è «Stato cambiato nel frattempo: non viene registrata» (non spuntata, con
   «Verifica in terapia»).
10. Dopo un tentativo «Annulla» diventa «Chiudi», e «Conferma 0» non compare più.

Regressione E2E `scripts/e2e/issue-445-partial-failure.mjs`, 8/8 PASS:
- S1: 500 sulla prima conferma;
- S2: rifiuto scritto con risposta persa;
- S3: rifiuto non scritto, torna ancora rifiutato;
- S4: collega che rifiuta Metformina con il pannello aperto → «Conferma 1», parte solo Ramipril, il
  rifiuto resta (`screenshots/qa-s4-stato-cambiato.png`).

## Files Changed

- `frontend/src/components/operator/AdessoQueue.tsx`, `AdessoQueue.css` — blocchi dosi, intestazioni orarie, niente nota
- `frontend/src/components/operator/TurnoDosePanel.tsx` — nuovo
- `frontend/src/components/operator/TurnoActionChips.tsx`, `frontend/src/lib/turnoChips.ts` — nuovi
- `frontend/src/lib/useTurnoAllergies.ts` — nuovo
- `frontend/src/components/operator/OperatorDashboard.tsx`, `OperatorDashboard.css` — chip, allergie, coda solo dosi
- `frontend/src/components/operator/OperatorClinicalKpiBand.tsx` — rimosso
- `frontend/src/components/operator/TurnoHandovers.tsx`, `.css` — «Da leggere», «Ho capito»
- `frontend/src/lib/adessoQueue.ts` — `dose` sulle voci terapia, `durataUmana`
- `frontend/src/lib/dashboardTherapies.ts` — `scheduledTime`, `doseMode`
- `frontend/src/App.tsx` — `onAcknowledgeConsegna`, niente «Chiudi tutte» sul Turno
- Test: `turnoSomministra445.test.ts` (nuovo), `operator-dashboard-first-view`, `clinicalOverviewResilience`, `adessoGrouping410`, `adessoQueue`, `patientRegime411`, `widgetGroupControls`
- `scripts/e2e/issue-445-turno.mjs`, `scripts/e2e/issue-445-roles.mjs`

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | `test-results/blocks-before.json`, `screenshots/01-turno.png`: Nanni 08:00 = 1 blocco, 2 farmaci, «Somministra 2»; nessun blocco ha più di un pulsante |
| AC2 | PASS | Esito parziale: `test-results/partial-failure.json` (rifiuto mai sovrascritto, riapertura con la sola dose fallita). `screenshots/02-pannello.png`, `03-dopo-conferma.png`: 2 righe spuntate, una «Rifiutata dal paziente». Richieste catturate: `/therapy-slots/confirm` + `/therapy-slots/not-administered`, `confirmed: true`, nessun farmaco dal client, URL invariato. DB: `erogata` + `non_erogata:rifiutata_paziente` (`test-results/db-after.json`). Dopo il reload il blocco non torna (4 → 3) |
| AC3 | PASS | allergie in tutti e 4 i blocchi (`logs/playwright-after.log`) |
| AC4 | PASS | nessun «N min» con N > 90 nel Turno; unit `durataUmana` |
| AC5 | PASS | nessun `.dashboard-kpi-band`, nessuna nota, nessun `.widget-group-controls`; le chip sono pulsanti |
| AC6 | PASS | consegna urgente di Medico 1 → «Ho capito» dal Turno di Infermiere 1 → `POST /consegne/:id/ack`, chip «1 urgenza da prendere in carico» sparita |
| AC7 | PASS | tsc + build verdi, unit 1350/1350, Playwright 1180×820 su DB locale |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | `logs/unit-tests.log` (1354/1354) |
| Integration | NA | |
| API | PASS | endpoint esistenti invariati, chiamati dal browser (`test-results/db-after.json`) |
| Playwright | PASS | `scripts/e2e/issue-445-turno.mjs` (11/11), `scripts/e2e/issue-445-partial-failure.mjs` (8/8), `logs/playwright-after.log`, `logs/playwright-partial-failure.log`, `trace/turno-1180x820.zip`, `screenshots/` |
| Persistence | PASS | righe `MedicationAdministration` nel DB e coda dopo il reload |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | |
| Security/privacy | PASS | nessun endpoint nuovo; il client manda solo la chiave dello slot; «Somministra» dietro capability |

## Runtime Evidence

Stack locale sintetico: Postgres embedded, DB `uxaudit` (seed dell'audit 11/10), backend
`AUTH_MODE=demo` con simulatore su :3111, vite su :5211, ruolo Infermiere 1 a 1180×820. Fixture:
consegna urgente creata via API come Medico 1. Ruoli: `logs/roles-probe.log` e
`screenshots/ruolo-*.png`. Medico 1 vede i blocchi senza «Somministra» e nessuna chip per le urgenze che ha scritto lui; OSS 1
vede le urgenze dei colleghi; Supervisore 1 non cambia; 0 errori in console.

## Logs

`logs/build.log`, `logs/unit-tests.log`, `logs/playwright-after.log`, `logs/roles-probe.log`.
Console del browser: 0 errori nel percorso Infermiere 1.

## Residual Risks

- «Parziale» non esiste fra i motivi del backend e non viene offerto. Restano i 6 motivi del giro.
- Il badge «Consegne» della barra laterale conta le note del diario non lette, non le consegne
  urgenti. Allinearlo alla home è la #446.
- Il pulsante «Allarmi N» (centro segnalazioni) resta nell'intestazione della coda: è un'azione,
  ma in parte ripete le chip. Da rivedere con la #446.
- Verifica su stack locale sintetico, non su prod.
- **Rischio residuo, lo stesso del giro (dal QA):** se il server salva DOPO che il client ha già
  ricevuto un errore di rete, una lettura intermedia può mostrare la dose ancora da fare. Se il
  Turno si rimonta, la scelta torna a «Somministrata». La protezione completa richiede idempotenza
  lato server (`requestId` su `/therapy-slots/confirm` e `/not-administered`, come già su `/prn`):
  decisione di backend, proposta come issue separata.

## Final Decision

CLOSED — VERIFIED
