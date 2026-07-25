# Task Validation Report

## Task

- Title: OCR con Azure Document Intelligence per il layout (ruolo ocr separato da extraction)
- Slug: ocr-con-azure-document-intelligence-per-il-layout-ruolo-ocr-separato-da-extracti
- Commit: PR #305 (merge `a1f7b8b`)
- Date: 2026-07-25

## Implementation Summary

Nuovo adapter `models/providers/azure_docintel.py` (stdlib urllib, nessuna dipendenza nuova) che
usa `prebuilt-layout` di Azure AI Document Intelligence con `outputContentFormat=markdown`.
Il ruolo `ocr` — presente in configurazione ma mai usato, perche' ogni job passava dal ruolo
`extraction` — viene ora selezionato dal campo `mode` di `RunRequest`, gia' presente nel
contratto e gia' valorizzato dal backend. Il backend chiede `mode: 'ocr'` per la trascrizione e
`extraction` per l'estrazione strutturata: layout a Document Intelligence, ragionamento clinico
a gpt-5.5, ambiti indipendenti.

Il ramo OCR scarta l'eventuale involucro `{"rawText": ...}` prodotto da un modello di chat, cosi'
il ruolo resta funzionante anche puntato a gpt-5.5 (nessuna regressione prima della commutazione).

## Files Changed

- `clinicos-ai-runtime/clinicos_ai/models/providers/azure_docintel.py` (nuovo)
- `models/spec.py`, `models/factory.py`, `models/profiles.py`, `models/registry.py`,
  `models/env_config.py` — provider, capability, credenziali, alias
- `domain/contracts.py` — `mode` accetta `'ocr'`
- `agents/extraction.py`, `api/app.py` — selezione del ruolo per mode
- `backend/src/ai/upload/job-service.ts` — `runtimeRunJob(rid, 'ocr')` per la trascrizione
- `clinicos-ai-runtime/tests/test_docintel.py` (nuovo, 12 test)

## Acceptance Criteria Result

| AC                         | Result | Evidence                                                                                                                                                                                              |
| -------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 (servizio disponibile) |   PASS | Verificato PRIMA di scrivere codice: `prebuilt-layout` risponde `202` sulla risorsa esistente con la chiave esistente; il risultato contiene una riga per farmaco con `polygon`. Nessun provisioning. |
| AC2 (ruoli indipendenti)   |   PASS | `test_ruoli_indipendenti_ocr_e_extraction`; in produzione `/v1/runtime/health` riporta `ocr azure-docintel:prebuilt-layout` ed `extraction azure:gpt-5.5`, `available: true`, `errors: 0`.            |
| AC3 (segmentazione)        |   PASS | Confronto a tre sullo stesso documento (sotto): 1 -> 4 -> **6** sezioni.                                                                                                                              |
| AC4 (test verdi)           |   PASS | Runtime **103/103** in locale e **AI Runtime Tests verde in CI** sul commit di merge; backend **381/381**; `tsc` pulito.                                                                              |

## Test Results

| Test             | Result | Evidence                                                                                                                                                               |
| ---------------- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | runtime 103/103 (12 nuovi: alias, capability, ruoli, analisi asincrona, ordine documenti, errori, chiave assente dai messaggi, scarto involucro JSON); backend 381/381 |
| Integration      |     NA | la chiamata reale a Document Intelligence e' verificata manualmente + end-to-end in prod                                                                               |
| API              |   PASS | contratto esteso in modo retrocompatibile (`mode` accetta un valore in piu')                                                                                           |
| Playwright       |     NA | nessuna modifica UI                                                                                                                                                    |
| Persistence      |     NA |                                                                                                                                                                        |
| OCR              |   PASS | end-to-end in produzione (sotto)                                                                                                                                       |
| Security/privacy |   PASS | test dedicato: la chiave non compare nei messaggi d'errore; endpoint e chiave letti da env, mai loggati                                                                |

## Runtime Evidence

Confronto end-to-end in produzione, **stesso documento** di 6 pagine con intestazioni "sporche"
(MAIUSCOLE con punti, oltre 60 caratteri) costruito per riprodurre il referto reale:

```
PRIMA (gpt-5.5, senza intestazioni) : heading 0 | sezioni 1 | {diagnosis}
MEZZO (gpt-5.5 + prompt intestazioni): heading 5 | sezioni 4 | {therapy, anamnesis, diagnosis, adviceAndFollowUp}
DOPO  (Document Intelligence)        : heading 0 | sezioni 6 | {therapy, anamnesis, diagnosis, hospitalCourse, adviceAndFollowUp, unmapped}
```

Document Intelligence ottiene la segmentazione **migliore delle tre** e recupera il decorso
ospedaliero, che l'approccio a prompt perdeva — pur non emettendo intestazioni markdown su questo
documento: le inferisce dagli stili visivi e il documento sintetico ha lo stesso font ovunque.
Il guadagno viene dalla fedelta' di riga, che rende affidabili anche le euristiche sul testo piano.

Health in produzione dopo la commutazione: `available: true`, `errors: []`,
`ocr azure-docintel:prebuilt-layout`, `extraction/agent/repair azure:gpt-5.5`.

Job sintetici cancellati; nessun paziente creato.

## Logs

- runtime locale: `Ran 103 tests — OK`; CI "AI Runtime Tests": success sul commit di merge
- backend: `# tests 381 # pass 381 # fail 0`
- nessun contenuto clinico nei log; fixture sintetiche e chiave finta nei test

## Residual Risks

- **Il beneficio atteso sulla completezza di dose e posologia NON e' dimostrato da questa prova.**
  Il documento sintetico ha 3 farmaci, tutti con dose e frequenza gia' complete in tutte e tre le
  configurazioni: non discrimina. Il divario misurato sul referto reale (dose 20/29, frequenza
  14/29) puo' essere confermato solo da un nuovo import dell'operatore.
- **Prestazioni**: 110s contro i ~40s del percorso solo-gpt-5.5 su questo documento. Le analisi
  sono in sequenza, una per pagina; sono parallelizzabili se il tempo diventasse un problema.
- Una porzione di testo finisce in una sezione `unmapped` (68 caratteri nella prova): intestazione
  non riconducibile ai nomi canonici. Da osservare su referti veri.
- I workflow GitHub `Deploy AI Runtime` e `Deploy Backend` falliscono allo **startup**, senza
  creare job, mentre gli altri workflow sullo stesso commit passano. Il deploy di questa modifica
  e' stato eseguito con la CLI Railway (`railway up --ci --service ...`, "Deploy complete" per
  entrambi i servizi). La pipeline CI di deploy resta da riparare: e' un problema indipendente da
  questa modifica ma va affrontato, altrimenti i prossimi merge non deployano da soli.

## Final Decision

CLOSED — VERIFIED

(l'integrazione e' verificata end-to-end in produzione e migliora la segmentazione; il beneficio
specifico su dose/posologia resta da confermare sul referto reale dell'operatore)
