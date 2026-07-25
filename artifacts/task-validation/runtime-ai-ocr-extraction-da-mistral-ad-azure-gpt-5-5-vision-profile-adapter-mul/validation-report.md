# Task Validation Report

## Task

- Title: Runtime AI: OCR/extraction da Mistral ad Azure gpt-5.5 (vision profile + adapter multimodale)
- Slug: runtime-ai-ocr-extraction-da-mistral-ad-azure-gpt-5-5-vision-profile-adapter-mul
- Commit: (working tree — non ancora committato)
- Date: 2026-07-25

## Implementation Summary

Sbloccato lo swap dei ruoli OCR/extraction da Mistral (endpoint ritirato) al deployment
Azure AI Foundry `gpt-5.5`, che prima era impossibile via sole variabili Railway:

1. `clinicos_ai/models/profiles.py` — l'euristica vision per openai/azure ora riconosce la
   famiglia `gpt-5` (`image_input=True`) e le concede `pdf_input=True` (file content parts
   API v1). I modelli precedenti restano invariati (4o resta image-only).
2. `clinicos_ai/models/providers/azure.py` — sostituito il runner generico solo-testo con
   `_AzureRunner` multimodale (stesso pattern del provider Google): gli allegati immagine
   vanno in `images=`, gli altri in `files=`. Mantenuta la semantica issue #239: un
   `RunOutput` con `status=ERROR` diventa `PROVIDER_ERROR` reale, mai una completion.

Nessuna modifica a backend, schema Prisma, API o frontend in questo task.

## Files Changed

- `clinicos-ai-runtime/clinicos_ai/models/profiles.py` (+7/-4)
- `clinicos-ai-runtime/clinicos_ai/models/providers/azure.py` (+69/-11)
- `clinicos-ai-runtime/tests/test_azure_gpt5.py` (nuovo, 6 test)

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                                           |
| --- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | `test_azure_gpt55_is_vision_and_pdf`, `test_extraction_requirement_passes_for_gpt55` (unmet=[]), `test_older_azure_models_unchanged` (4o: pdf resta False)                         |
| AC2 |   PASS | `test_forwards_images_and_files` (1 immagine → `images=`, 1 PDF → `files=`), `test_text_only_has_no_media_kwargs`, `test_status_error_raises_provider_error` (kind=PROVIDER_ERROR) |
| AC3 |   PASS | Suite completa runtime: **Ran 78 tests — OK** (`logs/unittest-runtime.txt`), nessuna regressione sugli altri provider                                                              |

## Test Results

| Test             | Result | Evidence                                                                          |
| ---------------- | -----: | --------------------------------------------------------------------------------- |
| Unit             |   PASS | 78/78 unittest, di cui 6 nuovi su gpt-5.5 (`logs/unittest-runtime.txt`)           |
| Integration      |     NA | chiamata reale ad Azure non eseguibile in locale (chiave solo su Railway)         |
| API              |     NA | contratto HTTP del runtime invariato                                              |
| Playwright       |     NA | nessuna UI toccata in questo task                                                 |
| Persistence      |     NA |                                                                                   |
| Agnos AI         |     NA | ruolo agent non modificato (già su azure:gpt-5.5)                                 |
| Voice            |     NA |                                                                                   |
| OCR              |   PASS | coperto dagli unit: selezione modello per ruolo ocr/extraction + inoltro allegati |
| Security/privacy |     NA | nessun secret nei log; il summary log-safe resta provider+model+source            |

## Runtime Evidence

Simulazione della configurazione Railway proposta (`load_runtime_config` + `ModelRegistry`,
chiavi REDACTED, nessuna rete):

```
available = True | errors = []
ocr         azure:gpt-5.5 temp=1.0 timeout=180s img=True pdf=True unmet=[]
extraction  azure:gpt-5.5 temp=1.0 timeout=180s img=True pdf=True unmet=[]
agent       azure:gpt-5.5 temp=1.0 timeout=180s img=True pdf=True unmet=[]
repair      azure:gpt-5.5 temp=1.0 timeout=180s img=True pdf=True unmet=[]
credenziali azure presenti = True
```

Prima della modifica lo stesso env falliva il gate di capability per ocr/extraction
(`image_input`/`pdf_input` non soddisfatte da `azure:gpt-5.5`).

**Verifica live contro Azure Foundry (2026-07-25)** — deployment reale, chiave letta da Railway
e mai stampata:

- prompt testuale minimo → HTTP 200, risposta `PRONTO` (il deployment `gpt-5.5` esiste e risponde);
- **prompt multimodale con immagine** (PNG sintetico 600x200 con testo clinico finto) → HTTP 200,
  contenuto restituito: `"LETTERA DI DIMISSIONE\n\nPaziente: Mario Sintetico\n\nDiagnosi: ..."`.
  Conferma che gpt-5.5 accetta le content-part immagine ed esegue OCR corretto — esattamente il
  caso d'uso dell'import (foto WhatsApp) che con Mistral ritirato falliva.

Variabili applicate sul servizio `clinicos-ai-runtime` (project token, `--skip-deploys`):
`AI_OCR_PROVIDER=azure-openai`, `AI_OCR_MODEL=gpt-5.5`, `AI_EXTRACTION_PROVIDER=azure-openai`,
`AI_EXTRACTION_MODEL=gpt-5.5`, `AI_TEMPERATURE=1` (era `0.2`, rifiutato da gpt-5.5 con 400).

Nota emersa in verifica: con le sole variabili per-ruolo (`AI_EXTRACTION_TEMPERATURE=1`,
`AI_OCR_TEMPERATURE=1`) il ruolo **repair** restava a `temp=0.0` → gpt-5.5 (reasoning model)
lo rifiuterebbe con 400. La variabile globale `AI_TEMPERATURE=1` copre ocr+extraction+repair
in un colpo solo ed è quella raccomandata.

## Logs

- `logs/unittest-runtime.txt`: `Ran 78 tests in 0.262s — OK`.
- Nessun log contiene chiavi, endpoint o dati paziente (fixture sintetiche, byte fittizi).

## Residual Risks

- **Config Railway: APPLICATA** (correzione di una stesura precedente di questo report, che la
  dava per non applicata perché il primo tentativo CLI rispondeva `Invalid RAILWAY_TOKEN`).
  Con il project token fornito dal committente le variabili sono state impostate e rilette dal
  servizio: `AI_OCR_PROVIDER/AI_EXTRACTION_PROVIDER=azure-openai`, `AI_OCR_MODEL/
AI_EXTRACTION_MODEL=gpt-5.5`, `AI_TEMPERATURE=1`. Impostate con `--skip-deploys`: diventano
  effettive al primo deploy del runtime, che deve avvenire DOPO il merge di questo codice
  (senza il fix di `profiles.py` il capability gate rifiuterebbe gpt-5.5).
- Residuo di pulizia su Railway (non bloccante): restano `MISTRAL_API_KEY` e `MISTRAL_OCR_URL`
  ormai inutilizzate, e una variabile malformata con **spazio iniziale** nel nome
  (` AI_OCR_MODEL=mistral-document-ai-2505`) che è inerte ma può trarre in inganno.
  `AI_REPAIR_MODEL=gpt-5.4-mini` e `AI_AGENT_MODEL=gpt-5.4-mini` puntano a un deployment
  diverso da `gpt-5.5`: non verificato in questa sessione se esista ancora su Foundry.
- `pdf_input=True` per gpt-5.5 assume il supporto file-parts via Agno `File`: se il deployment
  rifiutasse i PDF, l'errore emerge come PROVIDER_ERROR visibile (non un drop silenzioso).
  Il caso rotto oggi (foto WhatsApp) usa il ramo `images`, certo.
- `AZURE_OPENAI_ENDPOINT` deve restare la ROOT (`https://dpsaifoundry.services.ai.azure.com`,
  senza `/openai/v1`): Agno appende da sé `/openai/deployments/...`, un doppio path dà 404.
- Il gating del bottone "Importa dimissione" nella UI dipende ancora da `AI_PROVIDER`/
  `GEMINI_API_KEY` **lato backend** (`backend/src/ai/config.ts:104`), non dal runtime: il
  tooltip mostra il modello del backend (es. gemma), che è puramente cosmetico perché
  l'estrazione reale è delegata a `AI_RUNTIME_URL`. Allineare quell'etichetta è un task a parte.

## QA indipendente

Sessione QA separata (non quella che ha scritto il codice) sul commit `0663699`:
**QA PASSED**. Ha rieseguito in proprio suite runtime (78/78 OK), `tsc --noEmit` (pulito) e
`npm run build` (exit 0), ha confrontato `azure.py` con il runner generico sostituito
verificando che nessuna funzionalità sia andata persa (timeout, normalizzazione errori,
semantica issue #239) e ha confermato via `job-service.ts` che `canRetry` è calcolato dal
backend, quindi il routing del bottone è coerente con la state machine.

Rilievi accolti: la contraddizione sullo stato della config Railway (corretta qui sopra) e
l'auto-certificazione (sanata da questo verdetto indipendente). Un rilievo è stato respinto
con prova: il file `docs/superpowers/plans/...knowledge-base.md` NON è nel commit
(`git show --stat 0663699` → 13 file, nessun match; `docs/` pulito).

## Final Decision

CLOSED — VERIFIED
