# Backend configuration principles for a future Azure deployment (#225)

**Status:** principles only. **No production deployment is performed by this document** (AC3). Current
production keeps running on Railway; this defines _how_ config/secrets must be modelled so that a future
Azure backend is a configuration change, not a code rewrite.

Scope: environment/secret model + provider swappability for the AI/LLM layer (Agnos chatbot, OCR,
extraction) and general backend. Priority P2, parent program #159.

## 1. Env / secret model (AC1)

**Everything is environment-driven. Nothing is hardcoded** (provider, model, endpoint, deployment,
API key, token). This already holds in the runtime:

- LLM role selection lives only in the model registry / env loader
  (`clinicos-ai-runtime/clinicos_ai/models/configuration.py` → `env_config.resolve_*`,
  `registry.ModelRegistry`). Business logic never names a model or imports a provider SDK directly.
- Per-domain variables, kept separate:
  - **Agnos chatbot/reasoning** → `AGNOS_LLM_PROVIDER`, `AGNOS_LLM_MODEL`, `AGNOS_LLM_TEMPERATURE`,
    `AGNOS_LLM_MAX_TOKENS`, `AGNOS_LLM_TIMEOUT_MS`, `AGNOS_LLM_STREAMING_ENABLED`.
  - **Azure provider** (only when `AGNOS_LLM_PROVIDER=azure-openai`) → `AZURE_OPENAI_ENDPOINT`,
    `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`.
  - **OCR** → `AI_OCR_PROVIDER` / `AI_OCR_MODEL` (+ `MISTRAL_API_KEY`, `MISTRAL_OCR_URL`).
  - **Extraction** → `AI_EXTRACTION_PROVIDER` / `AI_EXTRACTION_MODEL`.
  - **Runtime** → `AI_RUNTIME_URL`, `AI_RUNTIME_SERVICE_TOKEN`, `AI_MAX_RETRIES`,
    `AI_PROVIDER_TIMEOUT_SECONDS`, `AI_MAX_CONCURRENCY`, `AI_JOB_MAX_DURATION_SECONDS`.
  - **Legacy** `AI_AGENT_MODEL` remains only as a fallback when `AGNOS_LLM_PROVIDER` is unset.

**Secret custody:**

- Runtime secrets live in the platform's secret store — Railway variables today; **Azure Key Vault**
  (referenced from App Service / Container Apps settings) for a future Azure backend. Never in git.
- Secrets are never committed and never printed as full values. Config summaries log
  provider/model/source only (see `env_config.safe_config_summary`), never keys/endpoints.
- Health checks are secret-free: they expose _presence_ booleans (`endpointConfigured`,
  `apiKeyConfigured`), never values (see `/v1/assistant/llm-health`, #239).

## 2. Provider dependencies remain swappable (AC2)

- Provider is a value in `provider:model_id` (or the `AGNOS_LLM_PROVIDER` alias). Supported providers
  are adapters under `clinicos_ai/models/providers/*` (google, openai, **azure**, anthropic, mistral,
  openai-like, mock). Swapping provider = changing an environment variable + credentials, **no code
  change**.
- The frontend never holds provider config or secrets; it calls the operator-authenticated backend,
  which holds the service token and talks to the runtime. Azure vs Google vs Mistral is invisible to
  the client.
- OCR/extraction (Mistral) stay independent from the Agnos reasoning provider: moving Agnos to Azure
  does not move OCR.

## 3. Azure OpenAI / Foundry endpoint principles (verified in #239)

When `AGNOS_LLM_PROVIDER=azure-openai` with an Azure **AI Foundry** resource
(`*.services.ai.azure.com`) consumed via the classic Azure OpenAI adapter:

- `AZURE_OPENAI_ENDPOINT` must be the **resource root** (e.g. `https://<res>.services.ai.azure.com`) —
  **without** a trailing `/openai/v1` (the SDK appends `/openai/deployments/...`; a doubled path → 404).
- `AZURE_OPENAI_API_VERSION` must be a version the deployment supports (a GA value such as
  `2024-10-21`; an unsupported/future value → 404).
- `AZURE_OPENAI_DEPLOYMENT` / `AGNOS_LLM_MODEL` = the **deployment name**.
- Reasoning models (e.g. gpt-5.x) accept only the **default temperature (1)**; sending `0.2` → 400.
- Provider errors must **surface** (HTTP 502 + sanitized `status=failure` log), never be swallowed into
  an empty result (fixed in the shared runner, #239).

## 4. Future Azure migration checklist (no action now — AC3)

1. Provision Azure backend host (App Service / Container Apps) + Postgres (Azure Database for
   PostgreSQL) — mirrors the current Railway topology.
2. Put all secrets in **Azure Key Vault**; reference them as app settings/env. No secrets in code/CI.
3. Set the same env variables documented in §1 (values differ per environment).
4. Run DB migrations with `prisma migrate deploy` at release (same as Railway today).
5. Validate with the secret-free health checks (`/v1/runtime/health`, `/v1/assistant/llm-health`) and
   a non-sensitive Agnos request before cutover.
6. Keep Railway as the source of truth until cutover is QA-approved by Codex. **This document performs
   no deploy.**

## 5. Privacy / security invariants (unchanged)

- No PHI, full prompts, full voice transcripts, raw OCR text, tokens, or secrets in logs.
- Role-based access enforced server-side; the frontend never gains privilege from self-asserted headers.
- Audit minimal and pseudonymized; correlation IDs, not patient identifiers.

## Acceptance Criteria

- **AC1 — Env/secret model documented:** §1 (variables per domain + Key Vault custody).
- **AC2 — Provider dependencies swappable:** §2 (env-driven provider adapters; no code change to swap).
- **AC3 — No production deploy performed:** this is documentation only; no deploy triggered.
