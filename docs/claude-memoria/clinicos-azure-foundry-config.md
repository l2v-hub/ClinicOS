---
name: clinicos-azure-foundry-config
description: ClinicOS su Azure Foundry — gpt-5.5 (estrazione/Agnos) + Document Intelligence (OCR layout); gotcha che fanno fallire in silenzio
metadata:
  node_type: memory
  type: project
  originSessionId: fd45ad57-ee30-4b2d-ab8b-e41e244b2540
  modified: 2026-07-25T12:46:12.524Z
---

ClinicOS usa **Azure AI Foundry** (`dpsaifoundry.services.ai.azure.com`) via il servizio Railway
`clinicos-ai-runtime`. Endpoint/chiave/modello mai nel codice: solo env. Ruoli separati:
`agent` (Agnos) → `AGNOS_LLM_*`; `extraction` → `AI_EXTRACTION_*` (azure-openai/gpt-5.5);
`ocr` → `AI_OCR_*` (**azure-document-intelligence/prebuilt-layout**); `repair` eredita Agnos.
Il `mode` di `RunRequest` sceglie il ruolo: `ocr` per la trascrizione, `extraction` per il resto.

Gotcha che fanno fallire in silenzio:

1. `AZURE_OPENAI_ENDPOINT` deve essere la **root** (senza `/openai/v1`): Agno appende
   `/openai/deployments/...` → doppio path → 404. Il suffisso serve solo a curl/SDK diretti.
2. `AZURE_OPENAI_API_VERSION=2024-10-21` funziona; `2026-04-24` → 404.
3. gpt-5.5 è reasoning: rifiuta temperature ≠ 1. Usare la **globale `AI_TEMPERATURE=1`** — le
   per-ruolo lasciano `repair` a 0.0.
4. Gli adapter con structured output passano lo schema in `response_format`: chi passa un
   **esempio** invece di un JSON Schema prende 400, e se il passaggio è best-effort l'errore
   sparisce (successo con la trascrizione: `rawText` vuoto e sezionamento sempre in fallback).

**Document Intelligence** (2026-07-25): stessa risorsa, stessa chiave, nessun provisioning —
`{root}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30&outputContentFormat=markdown`,
202 + `Operation-Location` da interrogare. Restituisce una riga per voce con `polygon`
(coordinate) e inferisce le intestazioni dagli **stili visivi**: su documenti a font uniforme non
emette `#`, ma la fedeltà di riga migliora comunque la segmentazione (misurato: 1 → 6 sezioni).
Serve perché gpt-5.5 vede le righe ma non il layout: sul referto reale 29 farmaci col nome ma
dose 20/29 e frequenza 14/29.

**I workflow `Deploy AI Runtime`/`Deploy Backend` falliscono allo startup** (0 job creati) mentre
gli altri passano: rilasciare con `railway up --ci --service <nome>` da un worktree su origin/main.
Diagnosi runtime: `GET /v1/runtime/health` (ruoli+modelli, secret-free).
Related: [[clinicos-branch-topology]], [[clinicos-deploy-mechanics]].
