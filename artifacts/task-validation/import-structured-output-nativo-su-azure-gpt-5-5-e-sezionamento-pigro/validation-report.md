# Task Validation Report

## Task

- Title: Import: structured output nativo su Azure gpt-5.5 e sezionamento pigro
- Slug: import-structured-output-nativo-su-azure-gpt-5-5-e-sezionamento-pigro
- Commit: (working tree — in attesa di PR)
- Date: 2026-07-25

## Implementation Summary

Due regressioni segnalate dall'operatore dopo lo swap a gpt-5.5 (PR #299), stessa radice:
l'adapter Azure trattava un modello generalista come una semplice chat, mentre Mistral
Document AI era un adapter specializzato per documenti.

1. **Terapia persa** — `_AzureRunner` ora espone `run_structured(prompt, schema, attachments)`.
   `agents/extraction.py:38` lo preferisce quando presente, quindi l'estrazione torna al percorso
   vincolato dallo schema come con Mistral: lo schema viaggia in
   `response_format: {type: json_schema, strict: false}` invece di essere un suggerimento nel
   prompt. Immagini inviate come content-part `image_url`, non-immagini (PDF) come content-part
   `file`. Chiamata via stdlib `urllib` (nessuna dipendenza nuova), stesso endpoint ROOT e stessa
   chiave gia' usati da Agno.
2. **Lentezza** — in `runJob` il passaggio di sezionamento (`runtimeSections`) veniva calcolato
   SEMPRE ma consumato solo quando `parseNarrativeFromMarkdown` non produceva testo di sezione.
   Ora e' invocato dentro quel ramo: nel caso normale l'import non paga piu' quel giro completo
   del modello su tutti i documenti.

## Files Changed

- `clinicos-ai-runtime/clinicos_ai/models/providers/azure.py` — `run_structured` + `_structured_body`
- `clinicos-ai-runtime/tests/test_azure_structured.py` (nuovo, 8 test)
- `backend/src/ai/upload/job-service.ts` — sezionamento spostato dentro il ramo di fallback
- `backend/src/ai/__tests__/lazy-sections.test.ts` (nuovo, 3 test)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                                                                                                                                     |
| --- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `test_extraction_prefers_run_structured` (hasattr True), `test_body_carries_schema_and_parts` (response_format.json_schema con lo schema fornito, `image_url` per l'immagine e `file` per il PDF), `test_no_attachments_still_valid`                                                         |
| AC2 |   PASS | `test_http_error_becomes_provider_error_without_secrets` (asserisce che la chiave NON compare nel messaggio), `test_429_becomes_rate_limit`, `test_missing_credentials_is_provider_unavailable`, `test_url_is_built_on_the_root_endpoint` (nessun doppio `/openai`, nessuno slash duplicato) |
| AC3 |   PASS | `lazy-sections.test.ts`: `runtimeSections` compare DOPO il guard `if (!narrativeHasSectionText(narrative))`; valvola `AI_SECTIONS_PASS` ancora presente; la trascrizione precede il parsing                                                                                                  |
| AC4 |   PASS | runtime Python **86/86 OK**; backend **379/379 pass, 0 fail**; `npx tsc --noEmit` backend pulito                                                                                                                                                                                             |

## Test Results

| Test             | Result | Evidence                                                                                                |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | `Ran 86 tests — OK` (runtime); `# pass 379 # fail 0` (backend)                                          |
| Integration      |     NA | la chiamata reale ad Azure e' verificata manualmente (sotto), non in CI                                 |
| API              |     NA | contratto HTTP del runtime invariato                                                                    |
| Playwright       |     NA | nessuna modifica UI                                                                                     |
| Persistence      |     NA | nessun dato nuovo persistito                                                                            |
| Agnos AI         |     NA | ruolo agent non toccato                                                                                 |
| Voice            |     NA |                                                                                                         |
| OCR              |   PASS | verifica manuale su deployment reale (sotto) + unit sulla costruzione richiesta                         |
| Security/privacy |   PASS | test dedicato: il messaggio d'errore non contiene la chiave; endpoint/chiave letti da env e mai loggati |

## Runtime Evidence

**Verifica manuale contro il deployment Azure reale** (chiave letta da Railway, mai stampata),
con lo **schema di estrazione ClinicOS vero** (`backend/ai-assets/clinicos-extraction.schema.json`)
e `strict:false`:

- da testo → HTTP 200, JSON conforme, `cartella.farmaci` popolato:
  Furosemide 25 mg al mattino e Ramipril 5 mg la sera, con `stato: attivo`; `diagnosi` popolata.
- **da PDF** (content-part `file`) → HTTP 200, farmaci estratti con posologia:
  Furosemide 25 mg 1 cpr al mattino (orale), Ramipril 5 mg 1 cpr alla sera (orale).

E' esattamente il comportamento che si era perso: prima dello swap lo garantiva
`document_annotation_format` di Mistral, ora lo garantisce `response_format`.

Perche' `strict:false` e non `strict:true`: lo schema e' draft-07 con un solo `required`, mentre
la modalita' strict di OpenAI pretende ogni proprieta' elencata in `required` a ogni livello e
rifiuterebbe lo schema. Con `strict:false` lo schema guida comunque il modello; resta attivo il
passo di repair su JSON invalido.

Baseline prestazioni da misurare dopo il deploy: prima della modifica, 8 foto (4,5 MB) in prod
impiegavano ~120s con stadi ~30s (estrazione) + ~15s (trascrizione) + ~75s (sezionamento).

## Logs

- runtime: `Ran 86 tests in 0.296s — OK`
- backend: `# tests 379 # pass 379 # fail 0`
- Nessun log con chiavi, endpoint o dati paziente: fixture sintetiche (chiave finta,
  byte fittizi) e paziente inventato "Mario Sintetico".

## QA indipendente

Sessione QA separata sul branch `fix/import-structured-output`: **QA PASSED**, con esecuzione
propria delle suite in un worktree isolato (runtime 86/86, backend 379/379, `tsc` pulito) e
ispezione del sorgente di `urllib` per validare il comportamento dei timeout.

Rilievi accolti e corretti in questa stessa PR:

1. **MEDIO — timeout mal classificati.** Il timeout del socket (`self._timeout`) scatta sempre
   prima di quello esterno (`+30s`) e `urllib` non incapsula il timeout in attesa di risposta:
   arrivava come `TimeoutError` grezzo nel ramo generico → `PROVIDER_ERROR` invece di `TIMEOUT`,
   violando AC2 e rendendo indistinguibili nei log "Azure e' lento" e "Azure ha rifiutato".
   Corretto: rami dedicati per `TimeoutError` e per `URLError` con `reason` di tipo timeout,
   con `HTTPError` intercettato per primo (deriva da `URLError`). Aggiunti 3 test
   (`test_socket_timeout_is_classified_as_timeout`,
   `test_connect_timeout_wrapped_in_urlerror_is_timeout`, `test_other_urlerror_is_provider_error`).
   Suite runtime ora **89/89 OK**.
2. **BASSO — encoding sull'event loop.** `_structured_body` (base64 di tutti gli allegati +
   `json.dumps`) girava sull'event loop prima di `to_thread`: su import multi-foto poteva
   ritardare altri job. Spostato dentro il thread.
3. **BASSO — documentazione trappola.** `docs/agnos-azure-openai-gpt55.md` riportava
   `AZURE_OPENAI_ENDPOINT` **con** `/openai/v1`, in contraddizione con la config reale: chi
   avesse "corretto" la variabile seguendo quella doc avrebbe rotto di nuovo l'estrazione con un
   404 silenzioso. Valore corretto alla root + nota esplicita sul perche'.

Rilievo non risolto e accettato consapevolmente: la guardia sul sezionamento pigro resta
**strutturale**; un test comportamentale richiederebbe un seam di iniezione su Prisma e sul client
HTTP del runtime, che oggi `job-service.ts` non ha. Annotato tra i rischi residui.

## Residual Risks

- `strict:false` guida ma non garantisce al 100% la compilazione dei campi: su documenti molto
  degradati la terapia potrebbe ancora risultare parziale. Il repair su JSON invalido resta.
- La guardia sul sezionamento pigro e' **strutturale** (ispeziona la sorgente), non un test di
  comportamento a runtime: verifica che la chiamata stia dentro il ramo di fallback, non che in
  esecuzione venga saltata. La misura reale va fatta in produzione dopo il deploy.
- `run_structured` bypassa Agno e parla direttamente all'API v1: se in futuro l'endpoint cambiasse
  forma, questo percorso e quello di Agno andrebbero aggiornati insieme.
- La riduzione di tempo attesa (~75s) vale solo quando il parsing del markdown trova le sezioni;
  su documenti che non le espongono il costo resta quello di prima (piu' il fallback).

## Verifica end-to-end in produzione (dopo il deploy)

Caso reale riprodotto: 8 immagini cliniche sintetiche, 4,5 MB complessivi (piu' pesanti delle 8
foto WhatsApp dell'operatore), un solo job contro la produzione.

**Primo tentativo — FALLITO, regressione trovata proprio qui.** `review_ready` in 120s (nessun
guadagno) con `rawText` vuoto e stadio `transcribing` mai comparso. Causa: `runtimeTranscribe`
passava `{ rawText: '' }` e `runtimeClinicalLists` un oggetto di esempio — ESEMPI di output, non
JSON Schema. Innocui finche' finivano nel prompt, ora finiscono in `response_format` e il provider
risponde 400; essendo passaggi best-effort dentro `try/catch`, il guasto spariva in silenzio.
Senza trascrizione il parsing del markdown non trovava sezioni e il sezionamento andava SEMPRE in
fallback, annullando il guadagno di questa stessa modifica. Corretto in PR #302 (schemi veri +
protezione nell'adapter che degrada al prompt invece di produrre un 400 muto).

**Secondo tentativo — PASS.** `review_ready` in **40 secondi** (contro i 120 di partenza, ~3x):

```
[0s]  waiting_for_model stage=model_processing
[30s] waiting_for_model stage=transcribing
[40s] review_ready      stage=completed
```

- `model: azure:gpt-5.5`
- `rawText`: 1191 caratteri → la trascrizione integrale e' tornata
- `_sections calcolato: False` → il sezionamento e' stato **saltato**: e' la prova che la
  pigrizia funziona in esecuzione, non solo nella struttura del codice
- `cartella.farmaci`: **4 farmaci con posologia** — Furosemide 25 mg 1 cpr al mattino,
  Ramipril 5 mg 1 cpr alla sera, Metformina 500 mg 2 volte al di', Cardioaspirina 100 mg dopo
  pranzo → la terapia, il dato che si era perso, e' recuperata
- `therapyText` e `diagnosisText` popolati; anagrafica corretta (Mario Sintetico, 1948)

Job sintetici di verifica cancellati; nessun paziente creato.

Nota su un fallimento intermedio non imputabile alla modifica: un tentativo e' fallito con
`ENOENT` su `/tmp/clinicos-imports/...` perche' il backend si e' riavviato a meta' elaborazione
durante il proprio deploy. Su Railway il filesystem del container e' effimero: un redeploy
azzera i file caricati e i job in volo non sono piu' riprendibili ("riprova senza ricaricare"
non puo' funzionare). E' una caratteristica architetturale nota che vale la pena affrontare a
parte (storage persistente o object storage per gli upload).

## Final Decision

CLOSED — VERIFIED
