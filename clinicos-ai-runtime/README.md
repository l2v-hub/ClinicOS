# ClinicOS AI Runtime (REQ-023 / REQ-024)

Provider- and model-agnostic AI runtime (Python + FastAPI + Agno). Isolates **all**
model/provider knowledge out of the ClinicOS backend/frontend. Change a model or
provider by editing a Railway variable — never the application code.

```
Frontend → ClinicOS Backend (auth, upload, persistence, validation, patient create)
                 ↓  internal authenticated API (neutral contracts)
         ClinicOS AI Runtime (this service): model/provider selection, OCR,
                 extraction, JSON repair, fallback, capability checks
                 ↓
         ModelFactory → ModelRegistry → provider adapter (SDK isolated)
```

The runtime **never** touches the clinical DB, creates patients, or receives user
credentials. It returns a proposal; the backend validates and persists it.

## Model Role Registry (REQ-024)

Four roles, each its own model — all `provider:model_id`, **no hardcoded IDs**:

| Role       | Variable              | Capability minimum        |
| ---------- | --------------------- | ------------------------- |
| ocr        | `AI_OCR_MODEL`        | image + pdf input         |
| extraction | `AI_EXTRACTION_MODEL` | image + pdf input         |
| agent      | `AI_AGENT_MODEL`      | text (+ tools if enabled) |
| repair     | `AI_REPAIR_MODEL`     | text                      |

Selection happens **only** through `ModelRegistry`. Provider SDK imports are allowed
**only** in `clinicos_ai/models/providers/*` — never in `agents/`, `api/`, `domain/`,
or the ClinicOS Node backend.

Change provider with one variable, no code change:

```env
AI_OCR_MODEL=openai:gpt-4o          # was google:gemma-4-31b-it
AI_OCR_MODEL=anthropic:claude-3-5-sonnet
AI_OCR_MODEL=openai-like:custom     # + OPENAI_LIKE_BASE_URL
```

## Neutral API (REQ-023 §3) — no provider in any path

```
GET  /v1/runtime/health
GET  /v1/runtime/capabilities
POST /v1/document-jobs
POST /v1/document-jobs/{id}/run        # 202, async
GET  /v1/document-jobs/{id}
GET  /v1/document-jobs/{id}/events
GET  /v1/document-jobs/{id}/result
POST /v1/document-jobs/{id}/retry
POST /v1/document-jobs/{id}/cancel
```

Authenticated with `Authorization: Bearer $AI_RUNTIME_SERVICE_TOKEN`.

## Run locally

```bash
cd clinicos-ai-runtime
python -m unittest discover -s tests        # core tests (no deps)
pip install -r requirements.txt             # for the API/agents
AI_RUNTIME_SERVICE_TOKEN=dev GOOGLE_API_KEY=... AI_OCR_MODEL=google:gemini-2.0-flash \
  AI_EXTRACTION_MODEL=google:gemini-2.0-flash AI_AGENT_MODEL=google:gemini-2.0-flash \
  AI_REPAIR_MODEL=google:gemini-2.0-flash python -m clinicos_ai.main
curl localhost:8000/v1/runtime/health
```

## Provisioning on Railway (USER ACTION — required to deploy)

The sandbox cannot create Railway services. To deploy:

1. Railway → project → **New Service** → from this repo, root `clinicos-ai-runtime/`
   (Dockerfile build). Name it **`clinicos-ai-runtime`**.
2. Set variables from `.env.example` (models per role + `AI_RUNTIME_SERVICE_TOKEN`).
3. Set provider secrets (`GOOGLE_API_KEY`, …) — **only** the providers you use.
4. Generate a domain; healthcheck `/v1/runtime/health`.
5. In the **backend** service set `AI_RUNTIME_URL` + `AI_RUNTIME_SERVICE_TOKEN` and
   wire the Node `processJob` to call the runtime instead of `@google/genai`
   (a thin `RuntimeExtractionProvider` HTTP client — see "Backend wiring" below).

## Backend wiring (next step)

The Node backend keeps auth, upload, persistence, validation, transactional patient
creation, and audit. Replace the in-Node `createExtractionProvider`/agent call in
`backend/src/ai/upload/job-service.ts` with an HTTP call to the runtime:
`POST /v1/document-jobs` → `POST :id/run` → poll `GET :id` → `GET :id/result`,
mapping the runtime status into the existing job state machine (REQ-022). The
backend then depends only on the neutral contract — no Google/Gemma references.

## Status

- ✅ ModelRegistry, ModelSpec (`provider:model_id`), per-role config, fallback,
  capability contract + gate, ModelFactory, provider adapters (SDK isolated),
  extraction+repair workflow, neutral FastAPI API, deploy artifacts.
- ✅ 19 core tests (stdlib) pass.
- ⏳ Deploy + backend rewiring require the user to provision the Railway service and
  set provider secrets (above). Real extraction subject to provider quota.
