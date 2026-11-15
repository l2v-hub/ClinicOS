# Task Validation Report

## Task

- Title: Bozze ingresso uniche, coerenza grafica e API dati sintetici
- Slug: bozze-ingresso-uniche-coerenza-grafica-e-api-dati-sintetici
- Commit: vedi `git log` del ramo `claude/relaxed-wright-t5j39k` (base `b5e79ae7`)
- Date: 2026-11-15

## Implementation Summary

1. **Bozze d'ingresso — una voce per paziente.** Causa riprodotta: ogni sessione d'import crea la
   propria bozza (unica per `importJobId`, non per paziente), quindi lo stesso operatore otteneva
   due voci identiche. Ora il server riconosce i doppioni per identità forte (CF valido oppure
   cognome+nome+data di nascita) e l'elenco mostra una sola voce principale (la più recente) con le
   precedenti richiudibili sotto di lei. Aggiunti «Elimina bozza» (archiviazione, non cancellazione),
   le bozze manuali nell'elenco e il refresh dell'elenco alla chiusura di «Importa dimissione».
   Nessuna fusione automatica di dati e nessuna archiviazione senza un gesto dell'operatore.
2. **Coerenza grafica.** Titolo di pagina sempre nella topbar (migrati Operatori, Posti Letto,
   Orari); controlli della topbar di misura costante; card di pagina con un solo raggio/bordo e
   senza ombre; `h1/h2` 18px/600 e base comune per `h3`; contenuto a tutta larghezza; Consegne con
   ritmo e stato vuoto coerenti. Regole centralizzate nel design system.
3. **API dati sintetici.** `GET /admin/synthetic-data`, `POST …/seed`, `POST …/wipe`, con il dataset
   estratto in moduli riusabili (`backend/src/synthetic/`): `seed.ts` da 995 a 106 righe,
   `routes/patients.ts` da 1294 a 655 righe, stessa logica condivisa da CLI, rotta legacy e nuova API.

## Files Changed

- Backend: `src/intake/draft-identity.ts` (nuovo), `src/intake/draft-service.ts`,
  `src/routes/intake-drafts.ts`, `src/synthetic/{index,wipe,extras,demo-dataset,demo-patient}.ts`
  (nuovi), `src/routes/admin-synthetic-data.ts` (nuovo), `src/routes/patients.ts`, `src/seed.ts`,
  `src/app.ts`, `src/authz/baseline.ts`, `src/authz/capability-registry.json` (rigenerato),
  `.env.example`; test: `src/intake/__tests__/draft-dedupe-db.test.ts`,
  `src/synthetic/__tests__/synthetic-data.test.ts`,
  `src/synthetic/__tests__/synthetic-data-destructive-db.test.ts`,
  `src/rooms/__tests__/demo-occupancy-seed.test.ts`.
- Frontend: `components/shared/intake/{draftList.ts (nuovo), intakeDraftApi.ts,
intakeDraftSession.ts, IntakeWorkspace.tsx}`, `components/operator/{PatientList.tsx,
PatientList.css, NewPatientFlow.tsx, ConsegneUnreadQueue.tsx}`,
  `components/shared/AIImportStatus.tsx`, `components/admin/{OperatorManagement,RoomsManagement,
OperatorSchedule}.tsx`, `design-system.css`, `compact-layout.css`, `design-system/README.md`;
  test: `components/shared/intake/__tests__/draftList.test.ts`.
- Catalogo capability: `.ai-architecture/phase-1-capabilities/CAPABILITY_CATALOG.{json,md}`.
- Documentazione: `docs/synthetic-data-api.md` (nuovo), `CLAUDE.md`.
- Nessuna modifica a schema Prisma, migrazioni, `VITE_API_URL`, `vercel.json`.

## Acceptance Criteria Result

| AC   | Result | Evidence                                                                                                                                                                                                                              |
| ---- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1  |   PASS | `screenshots/before-drafts-duplicate.png` (2 voci identiche) → `screenshots/after-drafts-grouped.png`, `after-drafts-older-open.png` (1 voce + «1 bozza precedente»); `trace/drafts-grouped-trace.zip`                                |
| AC2  |   PASS | `logs/api-drafts-dedupe.txt` (HTTP reale); test `duplicateOfIds`, `listDrafts segnala i doppioni`, `draftIdentityKey` (identità deboli mai raggruppate) in `test-results/backend-new-tests.txt`                                       |
| AC3 | PASS | `logs/api-drafts-dedupe.txt`: collega → 404, bozza confermata → 400; test `abandonDraft archivia senza cancellare…`; UI `screenshots/after-drafts-delete-confirm.png`, `after-drafts-deleted.png`; `logs/review-fixes-browser.txt` (fuoco dopo l'eliminazione, bozza eliminata non riaperta) |
| AC4  |   PASS | `logs/manual-draft-flow.txt` (5 passi nel browser); `screenshots/after-manual-draft-listed.png`, `after-manual-draft-resumed.png`; test `draftList.test.ts`                                                                           |
| AC5 | PASS | Criterio riscritto dopo la revisione: nessuna archiviazione senza un gesto dell'operatore. L'archiviazione automatica alla conferma è stata rimossa (`abandonDuplicateDrafts` eliminata dal servizio e dalla rotta); l'unico percorso che archivia è `PATCH {status:'abandoned'}` (test `abandonDraft…`) |
| AC6  |   PASS | `logs/manual-draft-flow.txt` (elenco aggiornato dopo la chiusura della scheda); prop `onClosed` di `AIImportStatus` → refresh in `PatientList.tsx`                                                                                    |
| AC7  |   PASS | `logs/style-audit-before.txt` (36px su 15 pagine, 44px su 2) → `logs/style-audit-after.txt` (44px su 17/17); titoli in topbar: `screenshots/after-ad-02-Operatori.png`, `after-ad-05-Posti_Letto.png`, `after-ad-06-Orari.png`        |
| AC8 | PASS | `logs/style-audit-after.txt`: tutti gli `H1/H2` 18px/600; 24 card di pagina `r12 sh:none`; le card consegna mantengono stria di priorità e ombra proprie (`logs/review-fixes-browser.txt`: bordo sinistro 5px rosso) |
| AC9 | PASS | `screenshots/before-op-05-Consegne.png` → `after-op-05-Consegne.png`; `before-ad-05-Posti_Letto.png` → `after-ad-05-Posti_Letto.png`; `logs/responsive-check.txt`; nomi lunghi nell'elenco bozze a 390/360px senza overflow (`screenshots/after-drafts-long-name-mobile.png`) |
| AC10 |   PASS | `logs/synthetic-api-seed-and-guards.txt` (seed due volte, stessi conteggi); test distruttivo in `test-results/backend-new-tests.txt` (conteggi esatti del dataset)                                                                    |
| AC11 |   PASS | `logs/synthetic-api-wipe.txt` (106 righe eliminate, identità e audit conservati, 0 trigger disabilitati); `screenshots/after-wipe-pazienti-empty.png`; giro app a sistema vuoto e ripopolato: 0 errori in console                     |
| AC12 | PASS | test `syntheticDataAvailability: fail closed…` (NODE_ENV assente/errato, demo solo dedotta, produzione → disabilitata), `identità e ruolo…`, `wipe: senza la frase di conferma…`, `ambiente non ammesso…`; capability in `CAPABILITY_CATALOG.json` e `capability-registry.json` (rispetto alla base solo aggiunte) |
| AC13 | PARTIAL | `test-results/frontend-and-build.txt` (frontend 1594/1594, build frontend e backend OK, nessun nuovo problema di lint sui file toccati); `test-results/backend-suite-comparison.txt` (nessun test fallisce solo sul ramo). Non PASS alla lettera: suite backend e lint completi sono rossi in questo ambiente già su `main` intatto. |

## Test Results

| Test             | Result | Evidence                                                                                                                                                                              |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | backend: `draftIdentityKey`, `duplicateOfIds`, `syntheticDataAvailability`, copertura tabelle; frontend: `draftList.test.ts` (6 test)                                                 |
| Integration      |   PASS | Postgres reale: `draft-dedupe-db.test.ts` (5), `synthetic-data-destructive-db.test.ts` (seed → wipe → seed, trigger append-only compresi, 3 esecuzioni consecutive)                   |
| API              |   PASS | HTTP reale sull'app: `synthetic-data.test.ts` (401/403/400, tier non ammesso), `logs/api-drafts-dedupe.txt`, `logs/synthetic-api-*.txt`                                               |
| Playwright       |   PASS | Bozze (prima/dopo, elimina, ricarica), flusso a mano, giro di tutte le pagine L1 per i due ruoli, tablet/mobile; trace in `trace/`                                                    |
| Persistence      |   PASS | Bozza eliminata assente dopo reload; bozza manuale ripresa dopo reload; conteggi DB prima/dopo seed e wipe                                                                            |
| Agnos AI         |     NA | Non toccato                                                                                                                                                                           |
| Voice            |     NA | Non toccato                                                                                                                                                                           |
| OCR              |   PASS | Import end-to-end con runtime AI mock usato per riprodurre i doppioni (2 sessioni → 2 bozze) e verificare il raggruppamento                                                           |
| Security/privacy |   PASS | Guardie tier/ruolo/conferma testate; SQL del wipe senza input dell'utente (solo nomi di tabella costanti); scansione segreti frontend: 0 findings; revisione indipendente: vedi sotto |

### Suite complete

- **Frontend** `npm test`: 1596 pass, 0 fail (dopo le correzioni della revisione). `npm run build`: OK.
- **Backend** `npm run build`: OK.
- **Backend** `npm test` su database isolato: **1847 pass, 106 fail** sul ramo; **1835 pass, 108
  fail** su `main` intatto (`b5e79ae7`) nello stesso ambiente. L'insieme dei test falliti è lo
  stesso (nessun test fallisce solo sul ramo; 2 falliscono solo su `main`, instabili). I 12 test in
  più sul ramo sono quelli nuovi di questo task, tutti passati. I fallimenti preesistenti non sono
  stati indagati in questo task.
- **Lint**: `npm run lint` fallisce anche su `main` (frontend 159 problemi, backend errori
  `no-control-regex` in file non toccati). Sui file toccati: frontend stessi 6 avvisi di prima,
  backend 0 problemi.

## Runtime Evidence

- Riproduzione del difetto: due import dello stesso paziente da due sessioni del browser →
  2 righe `PatientIntakeDraft` in stato `draft` con stessa anagrafica e stesso `createdById`;
  elenco con due pulsanti identici (`screenshots/before-drafts-duplicate.png`).
- Dopo la correzione, con gli stessi dati: 1 voce, bozza precedente richiudibile, eliminazione
  con conferma, persistenza dopo reload (`trace/drafts-grouped-trace.zip`).
- Seed → wipe → seed via HTTP e via test, con verifica che i trigger append-only siano di nuovo
  attivi e ancora efficaci dopo il wipe.
- Misure oggettive degli stili per pagina, prima e dopo (`logs/style-audit-*.txt`).

## Logs

Only sanitized logs are allowed. I log in `logs/` contengono solo identità sintetiche (`SEED-*`,
`SIM-*`, pazienti inventati), conteggi e codici di stato.

## Independent Review

Revisione indipendente del diff da parte di un agente QA dedicato (sola lettura). **Esito sulla
prima stesura: REJECT** — 1 rilievo bloccante, 6 importanti, 9 minori. Tutti verificati e gestiti:

| Rilievo | Problema | Correzione |
| --- | --- | --- |
| B1 (bloccante) | Il controllo dell'ambiente era «aperto per default»: con `NODE_ENV` assente o errato, o con il solo `DEMO_DATASET_ID`, seed e wipe risultavano abilitati | Ora chiuso per default: serve `NODE_ENV=development\|test` letterale, oppure `CLINICOS_ENV=demo` + dataset sintetico, oppure `CLINICOS_ENV=staging` + flag. Test estesi ai casi segnalati |
| M1 | La rigenerazione del registro capability aveva tolto due rotte del diario (`diary-unread`, `diary-unread-patient-counts`) presenti solo nel registro e non nel catalogo | Rotte aggiunte al catalogo sorgente e registro rigenerato: rispetto alla base contiene solo aggiunte |
| M2 | La conferma di un paziente archiviava in silenzio le altre bozze e ne eliminava i documenti | Archiviazione automatica rimossa |
| M3 | Una bozza a mano eliminata veniva riaperta da «Nuovo ingresso a mano» | La scheda dimentica la bozza eliminata; una bozza `abandoned` non viene mai riaperta (test + browser) |
| M4 | Nomi lunghi nell'elenco bozze causavano scorrimento orizzontale su telefono | Il pulsante va a capo (verificato a 390 e 360px) |
| M5 | La regola delle card toglieva stria di priorità e alone di fuoco alle consegne | Regola ristretta: solo raggio e ombra a riposo, mai il bordo; card consegna escluse |
| M6 | La documentazione dichiarava che il seed non riporta indietro i dati lavorati | Documentazione e commenti corretti: il seed ripristina i record del dataset di base |
| m1–m9 | Messaggio d'errore del wipe, precisazioni su audit e ruoli, guardia d'ambiente nel test distruttivo, fuoco dopo l'eliminazione, corsa su «Riprendi», descrizione del tool, audit dell'eliminazione, regole fuori da `@media screen` | Corretti; m7 (il tool `intake.update_draft` non archivia) è documentato nel catalogo, non allineato |

Le correzioni non sono state sottoposte a una seconda revisione indipendente.

## Residual Risks

- **Policy dei ruoli salvata**: se in un ambiente è attiva una policy salvata dalla pagina Ruoli,
  le tre nuove capability `synthetic_data.*` nascono negate (default della policy) finché non
  vengono abilitate. «Elimina bozza» non ne risente: usa la capability esistente
  `intake.update_draft`.
- **Ambiente della demo ospitata**: con il controllo chiuso per default le API funzionano sulla
  demo solo se `CLINICOS_ENV=demo` e `DEMO_DATASET_ID=synthetic-v1` sono entrambi impostati sul
  servizio; non ho potuto verificare le variabili reali.
- **Bozze doppie dopo la conferma**: confermato un paziente, un'eventuale altra bozza dello stesso
  paziente resta nell'elenco finché l'operatore non la elimina (scelta di sicurezza, vedi M2).
- **Wipe**: richiede che l'utente DB dell'applicazione sia proprietario delle tabelle
  (`ALTER TABLE … DISABLE TRIGGER USER`). È vero dove l'app esegue le proprie migrazioni; in caso
  contrario il wipe fallisce senza eliminare nulla (transazione unica).
- **Bozze con identità debole** (solo nome, senza data di nascita né CF) non vengono raggruppate
  per scelta di sicurezza: due omonimi restano due voci; l'operatore può eliminarne una.
- **Nessuna fusione automatica** fra bozze: i dati inseriti in una bozza precedente restano lì
  finché l'operatore non la riprende o la elimina.
- **Non verificato su produzione/demo ospitata**: tutte le prove sono locali (Postgres 16,
  Playwright). Il frontend va distribuito a mano (Vercel), il backend parte al merge su `main`.
- **Regressioni grafiche fuori dalle pagine L1**: le regole `h1/h2/h3` sono globali nell'app; sono
  state controllate a vista le pagine L1 dei due ruoli, la cartella paziente (Oggi) e i layout
  tablet/mobile, non ogni scheda della cartella né le stampe (le regole sono `@media screen`).
- La suite backend non è verde in questo ambiente già su `main` (106–108 fallimenti preesistenti).

## Final Decision

PARTIAL

Motivo: AC1–AC12 verificati con evidenza oggettiva in locale. AC13 non è soddisfatto alla lettera
(suite backend e lint completi non sono verdi in questo ambiente, già su `main` intatto, per cause
preesistenti non indagate qui); nessuna regressione introdotta dal ramo. Nulla è stato distribuito:
la verifica sull'ambiente ospitato e la certificazione del QA gatekeeper restano da fare.
