# Task Contract

## Task

- Title: Import: structured output nativo su Azure gpt-5.5 e sezionamento pigro
- Slug: import-structured-output-nativo-su-azure-gpt-5-5-e-sezionamento-pigro
- Type: change
- Date: 2026-07-25

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |      yes |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |       no |

## Current Behaviour

Dopo lo swap da Mistral a Azure gpt-5.5 (PR #299) l'import funziona ma con due regressioni
segnalate dall'operatore su documenti reali:

1. **Terapia non identificata.** L'adapter Mistral esponeva `run_structured`, e
   `agents/extraction.py:38` lo preferisce quando presente: lo JSON Schema veniva passato come
   `document_annotation_format`, quindi il modello era _obbligato_ a compilare i campi (farmaci,
   terapie inclusi). Il nuovo `_AzureRunner` NON espone `run_structured`, così l'estrazione ricade
   sul ramo generico (`extraction.py:41-45`): schema incollato nel prompt + "Rispondi SOLO con JSON
   valido". Per i campi a lista la resa e' molto piu' debole e la terapia puo' essere omessa.
2. **Prestazioni molto peggiori.** `runJob` esegue TRE passaggi completi sulle stesse immagini —
   estrazione, trascrizione (`runtimeTranscribe`), sezionamento (`runtimeSections`) — dove Mistral
   Document AI restituiva markdown + annotazione strutturata in UNA chiamata. Misurato su 8 foto
   (4,5 MB) in prod: ~30s + ~15s + ~75s = ~120s. Il sezionamento (il piu' costoso) e' calcolato
   SEMPRE ma usato solo come fallback quando `parseNarrativeFromMarkdown` non produce testo
   (`backend/src/ai/upload/job-service.ts:812-855`).

## Expected Behaviour

1. `_AzureRunner` espone `run_structured(prompt, schema, attachments)` che chiama l'endpoint
   Azure v1 con `response_format: {type: json_schema, strict: false}`, inoltrando le immagini come
   `image_url` e gli altri allegati come content-part `file`. `run_extraction` torna cosi' a usare
   il percorso schema-vincolato come con Mistral.
2. Il passaggio di sezionamento viene eseguito **solo** quando il parsing della trascrizione non
   ha prodotto testo di sezione, non piu' incondizionatamente.

## Acceptance Criteria

- AC1: `hasattr(runner, 'run_structured')` e' True per l'adapter Azure e la richiesta costruita
  contiene `response_format.json_schema` con lo schema fornito, una parte `image_url` per ogni
  immagine e una parte `file` per ogni non-immagine (verificato senza rete, con HTTP fake).
- AC2: `run_structured` normalizza gli errori come il resto dell'adapter: timeout →
  `ErrorKind.TIMEOUT`, HTTP non-2xx → `PROVIDER_ERROR`, 429/quota → `RATE_LIMIT`; e non espone mai
  chiave o endpoint nel messaggio d'errore.
- AC3: in `runJob` il sezionamento NON viene invocato quando la narrativa derivata dal markdown ha
  gia' testo di sezione; viene invocato quando non ce l'ha. Verificato con test sul backend.
- AC4: suite runtime Python e suite backend passano; `npm run build` del frontend non regredisce.

## Test Plan

| Test type                 | Required | Reason                                                                                |
| ------------------------- | -------: | ------------------------------------------------------------------------------------- |
| Unit                      |      yes | costruzione richiesta + normalizzazione errori di run_structured (HTTP fake, no rete) |
| Integration               |       no | la chiamata reale ad Azure e' gia' stata verificata manualmente (vedi Evidence)       |
| API                       |       no | contratto HTTP del runtime invariato                                                  |
| Playwright                |       no | nessuna modifica UI                                                                   |
| Persistence after refresh |       no | nessun dato nuovo persistito                                                          |
| Agnos action registry     |       no | ruolo agent non toccato                                                               |
| Voice simulation          |       no |                                                                                       |
| OCR/import test           |      yes | test backend sull'ordine dei passaggi (sezionamento pigro)                            |
| Security/privacy scan     |       no | nessun secret in log; asset e prompt invariati                                        |

## Evidence Plan

Required evidence:

- validation-report.md
- output test runtime Python e test backend
- prova che lo schema reale con `strict:false` popola i farmaci (gia' raccolta contro il
  deployment Azure: farmaci = Furosemide 25 mg al mattino, Ramipril 5 mg la sera,
  sia da immagine sia da PDF)

## Risks

- `strict:false` e' obbligato: lo schema e' draft-07 con un solo `required`, quindi la modalita'
  strict di OpenAI (che pretende ogni proprieta' in `required`) lo rifiuterebbe. Con `strict:false`
  lo schema guida il modello ma non e' garantito al 100%: resta il passo di repair su JSON invalido.
- Il sezionamento pigro cambia il contenuto di `_sections` in `resultData` (puo' diventare null nel
  caso felice). Il frontend gia' lo gestisce: preferisce le sezioni derivate dalla narrativa e usa
  `_sections` solo se la narrativa e' vuota (`DischargeImportModal.tsx:530-535`).
- La chiamata diretta HTTP costruisce l'URL come `{AZURE_OPENAI_ENDPOINT}/openai/v1/chat/completions`:
  l'endpoint deve restare la ROOT, coerente col vincolo gia' noto per Agno.

## Gate Status

READY FOR IMPLEMENTATION
