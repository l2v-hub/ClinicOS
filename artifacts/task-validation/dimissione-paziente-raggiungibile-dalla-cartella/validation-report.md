# Task Validation Report

## Task

- Title: Dimissione paziente raggiungibile dalla cartella
- Slug: dimissione-paziente-raggiungibile-dalla-cartella
- Commit: quello che contiene questo report (branch `claude/lucid-wozniak-ircv3y`)
- Date: 2026-11-25

## Implementation Summary

Un operatore non poteva impostare «Dimesso» dall'interfaccia: la finestra «Camera e Assegnazione»
(l'unica con il campo «Stato ricovero») non era aperta da nessun punto della cartella e, comunque,
salvava solo con camera e letto scelti.

Decisioni del product owner (24–25/11/2026): azione nel tab «Dimissione» **e** intestazione che
apre la finestra esistente; la dimissione chiude l'assegnazione del letto **se il ruolo può
gestire i posti letto**, altrimenti cambia solo lo stato e il letto resta assegnato; nessun
prerequisito sulla «Scheda di Dimissione».

Che cosa è cambiato (solo frontend, nessuna rotta nuova):

- **Tab «Dimissione»**: card «Stato del ricovero» con lo stato attuale e «Dimetti paziente»
  (oppure «Annulla dimissione» se il paziente è dimesso).
- **Intestazione della cartella**: camera/letto (o «posto letto non assegnato», o «Dimesso») è un
  pulsante che apre «Camera e Assegnazione». L'altezza dell'intestazione non cambia.
- **Finestra «Camera e Assegnazione»**: con «Dimesso» si salva senza camera e letto e si passa
  dalla stessa conferma; ogni ruolo modifica solo ciò che può salvare (vedi tabella).
- **Una conferma e un salvataggio**: `saveStay` in `lib/roomAssignmentModel.ts` — prima il letto
  (`onAssignCamera`), poi la cartella (`updConEsito` → `PUT /patients/:id/cartella`).
- **Chiusura del letto fallita**: `syncCameraAssignment` controlla la risposta; se la chiusura non
  riesce lo stato del ricovero non cambia e l'operatore vede un messaggio.
- **Riassegnazione nello stesso giorno**: un'assegnazione chiusa oggi resta attiva fino a
  mezzanotte; riassegnare un letto ora la riapre (`endDate: null`) invece di lasciarla scadere.
- **Profilo (Anagrafica)**: il modulo non copia più stato del ricovero, camera, letto e reparto —
  salvandolo dopo una dimissione li avrebbe riscritti con i valori letti all'apertura.

| Ruolo (policy predefinita)                 | Dimette | Posto letto alla dimissione                   |
| ------------------------------------------ | ------- | --------------------------------------------- |
| Infermiere, medico (cartella sì, letti no) | sì      | resta assegnato; la conferma lo dice          |
| Supervisore, amministratore (letti sì)     | no      | lo chiude dalla finestra, a paziente dimesso  |
| Ruolo con entrambi i permessi              | sì      | chiuso con data di oggi, tolto dalla cartella |
| OSS (nessuno dei due)                      | no      | —                                             |

## Files Changed

- `frontend/src/lib/roomAssignmentModel.ts` — regole e salvataggio dello stato del ricovero
- `frontend/src/components/operator/PatientDetail.tsx` — ingresso dall'intestazione, conferma unica,
  finestra coerente con i permessi, profilo che non riscrive lo stato
- `frontend/src/components/operator/cartella/StayStatusCard.tsx` — nuova card
- `frontend/src/components/operator/cartella/DimissioneTab.tsx` — mostra la card
- `frontend/src/App.tsx` — `syncCameraAssignment`: esito della chiusura, riapertura nello stesso giorno
- `frontend/src/components/operator/PatientRecordData.css` — solo layout (nessun controllo ridefinito)
- Test: `frontend/src/lib/__tests__/roomAssignmentModel.test.ts`,
  `frontend/src/components/operator/__tests__/dischargeFromChart.test.ts` (nuovo),
  `frontend/src/lib/__tests__/roomAssignmentScope.test.ts` (due asserzioni sul sorgente aggiornate
  alla nuova forma del codice)
- `scripts/e2e/dimissione-paziente.mjs` — flusso Playwright

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                      |
| --- | -----: | --------------------------------------------------------------------------------------------- |
| AC1 |   PASS | Playwright A6, A11 · `screenshots/04-tab-dimissione-prima.png`                                |
| AC2 |   PASS | Playwright A7, A8 · `screenshots/05-conferma-dimissione-infermiere.png`                       |
| AC3 |   PASS | Playwright A9, A10 (ruolo senza letti), D4, D5 (ruolo con letti) · unit `saveStay`            |
| AC4 |   PASS | Playwright A13, A14, A15 · `screenshots/07…`, `08…`, `09-dopo-ricaricamento.png`              |
| AC5 |   PASS | Playwright A2–A5, D1–D3, D6b · `screenshots/02…`, `14-finestra-dimesso.png`, `15…`            |
| AC6 |   PASS | Playwright C1–C3, D7, D7b · `screenshots/12-conferma-annulla-dimissione.png`, `13…`, `16b…`   |
| AC7 |   PASS | Playwright D8, D9 · `screenshots/17-chiusura-letto-fallita.png` · unit «bed cannot be closed» |
| AC8 |   PASS | `npm run build` exit 0 · `npm test` frontend 1652/1652 · Playwright Z1, Z2                    |
| AC9 |   PASS | Playwright A5, A12b, B2–B5 · `screenshots/03…`, `10-supervisore-tab-sola-lettura.png`, `11…`  |

## Test Results

| Test             | Result | Evidence                                                                              |
| ---------------- | -----: | ------------------------------------------------------------------------------------- |
| Unit             |   PASS | `logs/unit-tests.log` — 32 test dei tre file della modifica; suite frontend 1652/1652 |
| Integration      |     NA | Backend non modificato                                                                |
| API              |     NA | Nessuna rotta nuova o modificata                                                      |
| Playwright       |   PASS | `logs/playwright-run.log`, `test-results/dimissione-paziente.json` — 40/40            |
| Persistence      |   PASS | A15: dopo il ricaricamento elenchi e `GET /patients/:id/cartella` danno «dimesso»     |
| Agnos AI         |     NA | Non toccato                                                                           |
| Voice            |     NA | Non toccato                                                                           |
| OCR              |     NA | Non toccato                                                                           |
| Security/privacy |     NA | Nessun permesso né dato nuovo; evidenze solo su dati sintetici (`SEED-…`)             |

Build: `cd frontend && npm run build` → exit 0 (`logs/build.log`). Lint dei file toccati: stesso
numero di errori della base (`App.tsx` 12, `PatientDetail.tsx` 4,
`roomAssignmentModel.test.ts` 1, tutti preesistenti); zero nei file nuovi.

## Independent Review

Il diff è stato riletto da una sessione QA separata, in sola lettura (chi ha scritto il codice non
lo certifica).

- **Primo giro: FAILED VALIDATION.** Un bloccante (il modulo del profilo riscriveva lo stato del
  ricovero fuori dalla conferma) e sei rilievi minori: riassegnazione nello stesso giorno, stato
  occupato durante la scrittura del letto, «Salva» senza effetto per il supervisore, conferma
  muta a disponibilità camere non letta, fuoco su un controllo disabilitato, dettagli. Due
  sospetti visivi, poi misurati e confermati: intestazione più alta di 20px con la banda
  allergie, anello di fuoco tagliato.
- **Correzioni** applicate e coperte da test (unit e Playwright A12b, D6b, D7b).
- **Secondo giro: READY FOR QA.** Bloccante e riassegnazione confermati risolti, nessun nuovo
  bloccante. Dei rilievi residui a bassa gravità tre sono stati corretti dopo (letto «non noto»
  trattato come «assente», fuoco con camere in caricamento, nessun esito visibile alla chiusura
  del letto); gli altri sono fra i rischi residui.

## Runtime Evidence

Stack locale (Postgres locale, backend `AUTH_MODE=demo` con simulatore ruoli, frontend Vite),
dataset `POST /admin/synthetic-data/seed`. Nessun sito ospitato è stato toccato.

- `screenshots/01…17` — tutto il flusso, in ordine
- `trace/trace-infermiere.zip` (A), `trace-supervisore.zip` (B), `trace-infermiere-annulla.zip` (C),
  `trace-infermiere-con-letti.zip` e `trace-chiusura-letto-fallita.zip` (D)
- `video/*.webm` — una registrazione per sessione
- `test-results/dimissione-paziente.json` — esito di ogni controllo

Scenario D: nella policy predefinita nessun ruolo ha entrambi i permessi; il test concede
`room_assignments.create|update` all'infermiere **solo sul database locale**, con la stessa API
della pagina «Ruoli», e ripristina la policy alla fine.

Misure dell'intestazione (paziente con banda allergie): 77px prima e dopo la modifica a 1280 e
1024px; il pulsante è il link canonico da 44px.

## Logs

Only sanitized logs are allowed. I log contengono solo nomi di pazienti sintetici del seed.

## Residual Risks

- **Letto occupato fino a fine giornata.** Il backend considera attiva un'assegnazione con data di
  fine = oggi: dopo la chiusura il letto resta del paziente per tutto il giorno e torna libero dal
  giorno dopo. Comportamento esistente (#128), non modificato; conferma e messaggio dicono «chiusa
  con la data di oggi». Decisione aperta per il product owner.
- **Data di fine pianificata per oggi.** Riassegnare un letto riapre un'assegnazione che finisce
  oggi: non si distingue «chiusa oggi» da «pianificata per oggi». Nessuna schermata scrive date
  di fine pianificate; riguarda solo date create via API.
- **Policy predefinita.** Infermiere e medico dimettono ma non liberano il letto; il supervisore lo
  libera ma dalla barra laterale non ha l'elenco «Pazienti» (arriva alla cartella dalla ricerca o
  usa «Posti Letto»). È la scelta fatta; si cambia dalla pagina «Ruoli», senza codice.
- **Annullamento** riporta sempre a «Ricoverato»: lo stato precedente non è memorizzato.
- **Ordine delle scritture.** Se il letto viene chiuso e poi il salvataggio della cartella fallisce,
  il paziente resta non dimesso con l'assegnazione chiusa; riprovare è sicuro (la conferma resta
  aperta).
- **Intestazione, tastiera.** Con la banda allergie il bordo superiore dell'anello di fuoco del
  pulsante esce dallo schermo (visibile sugli altri tre lati) e la sua area di tocco sfiora
  «Completa», che resta in primo piano.
- **Modulo del profilo.** Copia ancora all'apertura altri campi senza controllo nel modulo
  (contatto d'emergenza, medico curante, data di ricovero): stesso difetto, fuori da questa
  modifica.
- **Elenco pazienti durante il caricamento.** Finché il riepilogo clinico non è arrivato, la vista
  «Non dimessi» mostra tutti i pazienti caricati, dimesso compreso, per una frazione di secondo.
  Preesistente (`PatientList.tsx`), non toccato.
- **Test sul sorgente.** Raggiungibilità, conferma unica e riapertura del letto sono provate a
  runtime da Playwright; i test unitari corrispondenti sono asserzioni sul sorgente.
- **Nessun rilascio.** La modifica è nel sorgente: demo e ambiente di sviluppo si aggiornano solo
  con l'operazione del proprietario.

## Final Decision

CLOSED — VERIFIED
