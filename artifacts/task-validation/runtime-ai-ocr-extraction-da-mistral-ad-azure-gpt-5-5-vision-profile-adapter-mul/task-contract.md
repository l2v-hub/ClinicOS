# Task Contract

## Task

- Title: Runtime AI: OCR/extraction da Mistral ad Azure gpt-5.5 (vision profile + adapter multimodale)
- Slug: runtime-ai-ocr-extraction-da-mistral-ad-azure-gpt-5-5-vision-profile-adapter-mul
- Type: change
- Date: 2026-07-25

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |       no |
| Backend/API          |       no |
| Database/Persistence |       no |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |      yes |
| Auth / Permissions   |       no |
| Privacy / Security   |       no |
| Config / Env         |      yes |

## Current Behaviour

L'endpoint Mistral usato dai ruoli OCR/extraction è stato ritirato: l'import documenti
fallisce. La sostituzione richiesta è il deployment Azure AI Foundry `gpt-5.5` (stesso
endpoint e chiave già usati da Agnos). Due blocchi nel codice runtime impediscono lo
swap via sole variabili:

1. `clinicos_ai/models/profiles.py` — l'euristica vision per openai/azure
   (`"4o","vision","o1","o3","4.1"`) non riconosce `gpt-5.5` → `image_input=False`,
   `pdf_input=False` hardcoded → il factory rifiuta il modello per i ruoli ocr/extraction
   (che richiedono image+pdf) PRIMA di ogni chiamata.
2. `clinicos_ai/models/providers/azure.py` — usa il runner generico `_common.make_built`,
   che ignora gli allegati (`agent.run(prompt)` solo testo): foto/PDF dell'import non
   arriverebbero mai al modello (estrazione silenziosamente vuota).

## Expected Behaviour

- `capabilities_for("azure:gpt-5.5")` dichiara `image_input=True` e `pdf_input=True`
  (famiglia gpt-5; PDF via file content parts dell'API v1).
- L'adapter Azure passa gli allegati come `agno.media.Image`/`File` (stesso pattern del
  provider Google) e mantiene la semantica issue #239 (RunOutput status=ERROR → errore
  provider reale, mai restituito come completion).
- Con le variabili Railway (`AI_EXTRACTION_PROVIDER=azure-openai`,
  `AI_EXTRACTION_MODEL=gpt-5.5`, idem OCR, `AI_*_TEMPERATURE=1`) il runtime seleziona
  azure:gpt-5.5 per ocr/extraction senza errori di configurazione.

## Acceptance Criteria

- AC1: `capabilities_for(ModelSpec.parse("azure:gpt-5.5"))` → `image_input=True`,
  `pdf_input=True`; il gate di capability per ruolo extraction (image+pdf richiesti) passa.
- AC2: `_AzureRunner.run` inoltra le immagini come `images=` e i non-immagine come
  `files=` ad Agno (verificato con agent fake), e solleva `PROVIDER_ERROR` su
  RunOutput status=ERROR invece di restituire il testo d'errore.
- AC3: l'intera suite test del runtime (`clinicos-ai-runtime/tests`) passa; nessuna
  regressione sugli altri provider.

## Test Plan

| Test type                 | Required | Reason                                                                       |
| ------------------------- | -------: | ---------------------------------------------------------------------------- |
| Unit                      |      yes | capabilities gpt-5.5 + runner multimodale Azure (agent fake, no rete/chiavi) |
| Integration               |       no | chiamata reale Azure non eseguibile in locale (chiave solo in Railway)       |
| API                       |       no | contratto HTTP del runtime invariato                                         |
| Playwright                |       no | nessuna UI toccata                                                           |
| Persistence after refresh |       no |                                                                              |
| Agnos action registry     |       no | ruolo agent non toccato                                                      |
| Voice simulation          |       no |                                                                              |
| OCR/import test           |      yes | coperto dagli unit sopra (selezione modello + inoltro allegati)              |
| Security/privacy scan     |       no | nessun secret/log aggiunto (pattern log-safe invariato)                      |

## Evidence Plan

Required evidence:

- validation-report.md
- output pytest/unittest della suite runtime (logs/)
- diff dei file toccati

## Risks

- `pdf_input=True` per la famiglia gpt-5 presume il supporto file-parts dell'API v1 via
  Agno File: se il deployment rifiuta i PDF l'errore emerge come PROVIDER_ERROR visibile
  (non drop silenzioso). Le foto (caso d'uso rotto oggi) usano il ramo images, certo.
- gpt-5.5 è un reasoning model: rifiuta temperature ≠ 1 → obbligatorio
  `AI_EXTRACTION_TEMPERATURE=1` e `AI_OCR_TEMPERATURE=1` in Railway (default codice 0.0).
- `AZURE_OPENAI_ENDPOINT` deve restare la ROOT (senza `/openai/v1`): Agno appende il path.

## Gate Status

READY FOR IMPLEMENTATION
