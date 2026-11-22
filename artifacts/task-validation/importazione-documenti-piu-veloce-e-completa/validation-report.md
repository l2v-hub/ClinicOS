# Task Validation Report

## Task

- Title: Importazione documenti piu veloce e completa
- Slug: importazione-documenti-piu-veloce-e-completa
- Commit: vedi `git log` del ramo `claude/relaxed-wright-t5j39k` (base `main` `9387dc81`)
- Date: 2026-11-22

## Analisi del flusso (prima)

Misure sulla demo con la lettera sintetica di 2 pagine (`fixtures/`, `logs/baseline/`), identiche
da PDF e da foto: **51 s** da «Avvia elaborazione» alla revisione.

| Fase                          |   Tempo | Causa                                                                                  |
| ----------------------------- | ------: | -------------------------------------------------------------------------------------- |
| avvio del lavoro              |  ~2,2 s | il lavoratore controlla la coda ogni 2 s                                               |
| OCR (Mistral OCR su Foundry)  | ~10,6 s | pagine lette **una dopo l'altra** (~5 s l'una); per pagina 4–5 richieste e attese di 1 s |
| estrazione (`gpt-6.1-sol`)    | ~38 s   | modello di fascia alta con ragionamento pieno; schema clinico **intero** (parametri, diario, indicatori, note, piano…) che l'ingresso poi scarta; testo con intestazioni e piè di pagina ripetuti |
| attesa dell'interfaccia       | 0–2 s   | stato riletto ogni 2–2,5 s                                                            |

Qualità: l'OCR era **corretto** (tabelle comprese). I dati si perdevano **dopo**:

- telefono, indirizzo, email: estratti dal modello ma assenti nella scheda di revisione;
- referente, comune/provincia/CAP, luogo di nascita, struttura inviante, motivo d'ingresso: mai
  compilati (nessun collegamento ai campi dell'ingresso);
- terapia in tabella: 10 farmaci letti dal modello, ma 12 righe senza nome dal testo (intestazione e
  separatore della tabella diventavano «farmaci») + 10 righe doppie da verificare;
- intestazione e piè di pagina dell'ospedale finiti dentro «Decorso clinico».

## Implementation Summary

Flusso invariato (OCR → testo markdown → modello → campi), migliorato in ogni passaggio:

1. **Velocità** — pagine lette in parallelo (`AI_OCR_PAGE_CONCURRENCY`, 4) e lettere estratte in
   parallelo (`AI_EXTRACTION_GROUP_CONCURRENCY`, 2), con le stesse garanzie di ripresa; il lavoro
   parte appena richiesto (niente attesa della coda); capacità del servizio AI chieste una volta per
   lavoro; attese verso il servizio AI da 150 ms a 500 ms (erano 1 s); interfaccia che rilegge lo
   stato ogni secondo nel primo mezzo minuto.
2. **Testo pulito** — nuovo filtro deterministico (`sections/page-furniture.ts`): le righe ripetute in
   cima o in fondo alle pagine restano solo sulla prima/ultima pagina; mai una riga con una dose; il
   testo OCR originale resta intatto. Al modello e alle sezioni va il testo ripulito.
3. **Modello** — schema ridotto ai soli campi dell'ingresso, ognuno descritto
   (`ai-assets/clinicos-intake-extraction.schema.json`, 5,3 kB), nel sottoinsieme «strict»: il
   servizio AI lo chiede in modalità vincolata; istruzioni nuove
   (`ai-assets/intake-extraction-prompt.it.txt`): dati del paziente e non dell'ospedale, ignorare
   intestazioni/piè di pagina/firme. Sforzo di ragionamento regolabile
   (`AI_EXTRACTION_REASONING_EFFORT`, sul servizio AI). Se il modello rifiuta modalità vincolata o
   sforzo, la richiesta viene ripetuta una volta nella forma di sempre.
4. **Campi** — i dati estratti arrivano all'ingresso: luogo di nascita, comune, provincia, CAP,
   referente (nome, relazione, telefono), provenienza, centro inviante, motivo d'ingresso; telefono,
   email e indirizzo nella revisione. Stesse regole di proprietà degli altri campi (scritti solo se
   vuoti, altrimenti proposti) e segno «AI» con la pagina di origine.
5. **Terapia in tabella** — ogni riga della tabella diventa una prescrizione, cella per cella secondo
   l'intestazione; ciò che non trova un campo (dose diversa, via non standard, note) resta nelle note;
   tutte «da verificare». Il nome estratto dal modello copre la riga corrispondente: niente doppioni.

Backend, Prisma, rotte: nessuna rotta né tabella nuova; Prisma e `VITE_API_URL` invariati.

## Files Changed

Backend: `ai/upload/pages/{worker,runtime,results,inputs,draft-source,draft-merge}.ts`,
`ai/upload/worker.ts`, `ai/sections/page-furniture.ts` (nuovo), `ai/config.ts`, `ai/merge.ts`,
`intake/{draft-service,parse-discharge-therapy,therapy-source-inventory}.ts`,
`routes/import-pages.ts`, `ai-assets/` (2 nuovi), `.env.example`; test nuovi `page-furniture`,
`intake-extraction-schema`, `therapy-table`, casi in `draft-merge` e
`tests/integration/po05-backend`. Servizio AI: `models/providers/azure.py`, test,
`.env.example`. Frontend: `import/importSessionApi.ts`, `DischargeImportModal.tsx`,
`intake/{useIntakeDocuments,intakeDocuments}.ts`, `StepAnagrafica.tsx`, `StepIngresso.tsx`, test.

## Acceptance Criteria Result

| AC  | Result | Evidence |
| --- | -----: | -------- |
| AC1 |   PASS | `logs/locale-istantaneo-2-pagine/tempi.txt`: 0,8 s (erano 4,3 s); `logs/locale-ritardi-4-pagine/`: 4 pagine con 3 s di OCR ciascuna partono insieme (inizio 19.912–19.928 ms, fine 22.913–22.929 ms), totale 8,8 s = 3 s OCR + 4 s estrazione + ~1,8 s |
| AC2 |   PASS | test di integrazione nuovo: pagina fallita → le altre 3 conservate, al nuovo tentativo si rilegge solo quella; lavoro superato non scrive (test esistente adattato: ≤2 pagine in volo, nessuna ripetuta) — `logs/integration-after.log` |
| AC3 |   PASS | `page-furniture.test.ts` (7 casi, trascrizione OCR reale); testo inviato al modello verificato nel servizio di prova: «Decorso» continua sulla pagina 2 senza intestazione |
| AC4 |   PASS | `intake-extraction-schema.test.ts`; `logs/locale-bozza-da-revisione/campi.txt`: 17 campi su 19 compilati (gli altri 2 assenti dal documento), terapia 9/9 farmaci |
| AC5 |   PASS | `screenshots/revisione-una-lettera.png` (telefono e indirizzo); test in `draft-merge.test.ts` |
| AC6 |   PASS | `logs/locale-documenti-nella-scheda/campi-ai.txt`: 16 campi con segno «AI» e pagina; «Comune» scritto dall'operatore resta «Imola», l'AI lo propone soltanto; `screenshots/sezione-*.png` |
| AC7 |   PASS | `tests/test_azure_structured.py`: senza variabile richiesta invariata; modalità vincolata solo con schema compatibile; un 400 ripete una volta nella forma di sempre |
| AC8 |   PASS | frontend 1602/1602 + build OK; servizio AI 249/249; backend 1982 test: stessi 150 fallimenti di prima (database/ambiente di questo container), 0 nuovi (`logs/backend-tests-summary.txt`); integrazione 47 pass, stessi 5 fallimenti di prima |
| AC9 |   PASS | sulla demo, stessi documenti, modelli veri: **19,4 s** dal PDF e **19,0 s** dalle foto (erano 51 s); OCR ~6 s (era ~11), estrazione ~12 s (era ~38); 17/19 campi (gli altri 2 assenti dal documento), terapia 9/9, bozza riaperta identica — `logs/demo-dopo/` |

## Test Results

| Test             | Result | Evidence |
| ---------------- | -----: | -------- |
| Unit             |   PASS | suite frontend, backend (nessun fallimento nuovo), servizio AI |
| Integration      |   PASS | `logs/integration-{before,after}.log` |
| API              |   PASS | importazione via API locale nei test di integrazione |
| Playwright       |   PASS | `fixtures/{measure,e2e-fields,e2e-docs}.cjs`, `logs/locale-*` |
| Persistence      |   PASS | bozza ricaricata e riaperta con «Riprendi bozza»: campi identici |
| Agnos AI         |     NA | |
| Voice            |     NA | |
| OCR              |   PASS* | *OCR e risposta del modello simulati (`fixtures/replay-runtime.mjs`): OCR = trascrizione reale salvata dalla demo, estrazione = risposta attesa |
| Security/privacy |   PASS | nessun testo clinico nei log nuovi; nessun host, segreto o permesso nuovo; documenti di prova sintetici |

## Runtime Evidence

Demo dopo il rilascio: `logs/demo-dopo/` (tempi e campi con i modelli veri). Ambiente locale: frontend 5173, backend 3001 con Postgres locale, servizio AI **di prova**
(`fixtures/replay-runtime.mjs`), profilo Operatore. Misure di partenza sulla demo
(`logs/baseline/`, sessioni di prova eliminate). Nulla pubblicato.

## Rilascio

Unito in `main` con [l2v-hub/ClinicOS#543](https://github.com/l2v-hub/ClinicOS/pull/543) (`4db597a5`), CI verde
(compresi browser-e2e e real-provider). Pubblicati il 2026-11-22 sulla demo:

- servizio AI `clinicos-ai-runtime` al commit `4db597a5` (deployment `2a255a4e`, SUCCESS; prima era
  la versione del 3 ottobre), variabile `AI_MAX_CONCURRENCY=10`;
- backend `clinicos-backend` al commit `4db597a5` (deployment `d3bb7f0d`, SUCCESS, «No pending
  migrations», worker avviato), variabili `AI_OCR_PAGE_CONCURRENCY=6`,
  `AI_EXTRACTION_GROUP_CONCURRENCY=4`;
- frontend `dpl_8uh2oECV9BA233uz9LWVTjGUYdRx` (READY, alias `clinicos-eosin.vercel.app`), build
  locale con `VITE_API_URL` = backend `…-df88`.

`AI_EXTRACTION_REASONING_EFFORT` non impostata: la richiesta al modello ha lo sforzo predefinito del
modello. Sessioni e bozze di prova create dalle verifiche eliminate.

## Residual Risks

- Misurato con UNA lettera sintetica: lettere vere di altri ospedali e formati vanno provate
  dall'utente (in corso).
- Il rilascio ha portato il servizio AI dal 3 ottobre a `main`: include anche le modifiche successive
  (voce realtime, registro dei fornitori), verificate solo dall'avvio e dall'importazione.
- 6 pagine in parallelo verso l'OCR di Foundry: limite di richieste del servizio non noto; una
  pagina rifiutata resta riprovabile senza perdere le altre.
- Il filtro di intestazioni lavora sulle righe uguali fra pagine: un'intestazione che cambia a ogni
  pagina (es. data e ora diverse) resta nel testo.
- Le sessioni aperte prima del rilascio ricalcolano l'estrazione (schema e istruzioni nuovi).
- Nessuna revisione indipendente del diff.

## Final Decision

CLOSED — VERIFIED
