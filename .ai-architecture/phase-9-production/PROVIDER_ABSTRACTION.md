# Phase 9 — Provider Abstraction (AI + STT)

**Provider is configuration, not architecture.** Agno, Skills, Tools, workflows, authorization,
UI and business logic never name a provider, a model or an SDK. Changing
`OpenAI → Claude → Gemini → Azure → local` is a runtime configuration change; adding a provider is
**adapter + registry entry + config + tests**.

```
Backend (Skills / Assistant / Proactive / Voice / Import)       — vendor-free (HTTP to the runtime)
        │ POST /v1/assistant/{skill-route,plan,compose}, /v1/voice/transcribe, /v1/document-jobs
        ▼
AI runtime — agents (skill_router, assistant, extraction)        — speak LOGICAL ROLES only
        │ contract.generate(registry, AIRequest(role=…))
        ▼
AI abstraction layer  models/contract.py                         — AIRequest/AIResponse/Usage, errors,
        │                                                          budget, fallback policy, telemetry
        ▼
Provider registry  models/provider_registry.py  ←  configuration (AI_PROVIDER, AI_MODEL_<ROLE>)
        ▼
Adapters  models/providers/{openai,azure,google,anthropic,openai_like,mistral,azure_docintel,mock,fake}.py

Voice layer  voice/stt.py ── STT contract ── registry (stt_module) ── voice/providers/{openai,azure,google,mock,fake}.py
```

## 1. Single configuration point (runtime service)

```env
AI_PROVIDER=openai                 # the ONE switch (registered name or alias)
AI_MODEL_DEFAULT=<model id>        # used by every role without its own entry
AI_MODEL_COMMAND_PARSER=…          # optional per-role override; "provider:model" also overrides the provider
AI_MODEL_REASONING=…  AI_MODEL_SUMMARY=…  AI_MODEL_FAST=…  AI_MODEL_VISION=…
AI_TEMPERATURE_DEFAULT / AI_TEMPERATURE_<ROLE>   # unset = provider default (reasoning models)
AI_TIMEOUT_SECONDS_<ROLE>          # defaults: command_parser/reasoning/summary 30, fast 60, vision 300

STT_PROVIDER=openai                # voice switch
STT_MODEL=<transcription model>

AI_FALLBACK_ENABLED=false          # explicit only
AI_FALLBACK_PROVIDER=              # + AI_FALLBACK_MODEL_DEFAULT / AI_FALLBACK_MODEL_<ROLE>

AI_DAILY_TOKEN_BUDGET=0            # app-level guard (0 = off)
AI_PROVIDER_SDK_RETRIES=0          # no hidden SDK/Agno retries
AI_MAX_OUTPUT_TOKENS=              # optional cap (OpenAI adapter)
OCR scope unchanged: AI_OCR_PROVIDER / AI_OCR_MODEL
```

Credentials are per provider and read only inside its adapter: `OPENAI_API_KEY` (+ `OPENAI_BASE_URL`,
`OPENAI_ORG_ID`), `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT`, `GOOGLE_API_KEY`/`GEMINI_API_KEY`,
`ANTHROPIC_API_KEY`, `OPENAI_LIKE_BASE_URL` + `OPENAI_LIKE_API_KEY`, `MISTRAL_API_KEY`.

**Legacy mode** (no `AI_PROVIDER`): the pre-Phase-9 variables (`AGNOS_LLM_*`, `AI_EXTRACTION_*`,
`AI_REPAIR_MODEL`, `AI_STT_MODEL`) still resolve the same logical roles. Verified against the real
production runtime variables (2026-10-02): mode legacy, 6 roles resolved, 0 errors — the new code
deploys without any variable change.

## 2. Logical model roles (`contract.ModelRole`)

| Role             | Used by                                                          | Legacy source                      |
| ---------------- | ---------------------------------------------------------------- | ---------------------------------- |
| `COMMAND_PARSER` | skill routing (NL → skill + slots) `agents/skill_router.py`      | `AGNOS_LLM_*`                      |
| `REASONING`      | read-only query planner `agents/assistant.py#run_assistant_plan` | `AGNOS_LLM_*`                      |
| `SUMMARY`        | grounded answers + shift briefing `run_assistant_compose`        | `AGNOS_LLM_*`                      |
| `FAST`           | JSON repair `agents/extraction.py`                               | `AI_REPAIR_MODEL` (inherits Agnos) |
| `VISION`         | document/photo extraction (structured)                           | `AI_EXTRACTION_*`                  |
| `OCR`            | layout OCR (separate scope)                                      | `AI_OCR_*`                         |
| `STT`            | voice transcription (separate contract)                          | `AI_STT_MODEL`                     |

Legacy names `agent` / `extraction` / `repair` remain accepted aliases of the registry.

## 3. Contracts

**AI** (`models/contract.py`): `AIRequest(role, prompt, attachments, schema?, allow_fallback, purpose)`
→ `generate(registry, request)` → `AIResponse(text, role, provider, model, usage: Usage, finish_reason,
latency_ms, fallback_used)`; `.completion()` keeps finish metadata for truncation checks; `.metadata()`
is what the runtime returns to the backend (`ai` field). Adapter protocol: `build(spec, role,
temperature, timeout) → BuiltModel(runner.run(prompt, attachments), optional runner.run_structured)`.
Structured output: native JSON schema when the adapter has `run_structured`, otherwise the gateway
embeds the schema in the prompt (no silent loss).

**STT** (`voice/stt.py`): `transcribe(audio, mime, locale) → TranscriptResult(text, provider, model,
usage{inputTokens, outputTokens, audioSeconds}, empty)`; adapters `transcribe(model, audio, mime,
locale, timeout) → (text, usage)` raising `SttError(kind)`.

**Normalized errors** (`models/errors.py`): `AUTH_ERROR, RATE_LIMIT, TIMEOUT, PROVIDER_UNAVAILABLE,
INVALID_REQUEST, CONTEXT_LIMIT, CONTENT_REJECTED, MALFORMED_RESPONSE, CANCELLED, UNKNOWN` via
`ai_error_code()`; vendor exceptions are classified by HTTP status / exception type / message
(`classify_exception`) without importing any SDK. Runtime 502 bodies: `{"error", "code"}`.

**Normalized usage**: `Usage(input_tokens, output_tokens, cached_input_tokens, reasoning_tokens,
audio_seconds, provider, model, request_id)` from the OpenAI Responses usage, Agno `RunMetrics`
(Azure/Gemini/Claude/OpenAI-like), Gemini/OpenAI STT usage.

## 4. Primary provider: OpenAI API Direct

`models/providers/openai.py`: Responses API (`client.responses.create`, `store=False`), AsyncOpenAI with
`max_retries=0`, real cancellation, multimodal input (`input_image`, `input_file`), JSON-schema
structured output (`text.format`), incomplete/refusal/content-filter mapping, usage incl. cached and
reasoning tokens. STT: `voice/providers/openai.py` (`/audio/transcriptions`). Both honour
`OPENAI_BASE_URL` (OpenAI-compatible gateways; contract tests against a local stub).

**Status:** implemented and contract-tested end-to-end with the official SDK against an
OpenAI-compatible stub (no key). **Real OpenAI calls not yet executed: `OPENAI_API_KEY` is not set on
Railway** (external). Activation = §7.

## 5. Fallback policy

Off by default. When `AI_FALLBACK_ENABLED=true`, only availability failures (`RATE_LIMIT`, `TIMEOUT`,
`PROVIDER_UNAVAILABLE`) move to the fallback provider, never `CONTENT_REJECTED`, `AUTH_ERROR`,
`INVALID_REQUEST`; a request with `allow_fallback=False` is never re-routed. Every fallback is marked
(`fallbackUsed`, metric `clinicos_ai_provider_fallback_total`) — no silent switch. Model outputs are
interpretations: every write still needs the human «Conferma» and backend authorization.

## 6. Adding a provider (e.g. local model, OpenRouter, Claude)

1. Adapter `models/providers/<name>.py` with `build(...)` (and `voice/providers/<name>.py` for STT) —
   the only file importing its SDK; map errors with `errors.classify_exception`, attach usage.
2. One `ProviderEntry` in `models/provider_registry.py` (module, credential env, aliases, capability
   function, traits).
3. Credentials/config on the runtime service; `AI_PROVIDER=<name>` (+ `AI_MODEL_*`).
4. Regenerate `PROVIDER_CAPABILITY_MATRIX.json` (`python -m tools.capability_matrix --out …`).
5. Contract tests (pattern: `tests/test_provider_agnostic.py`, stub server or fake) + benchmark
   (`python -m tools.benchmark.run`). Nothing else changes. OpenAI-compatible local servers
   (vLLM, Ollama, LM Studio, OpenRouter) need no code: `AI_PROVIDER=openai-like` (alias `local`) +
   `OPENAI_LIKE_BASE_URL`.

## 7. Switch procedure (production, OpenAI Direct)

Runtime service `clinicos-ai-runtime` (Railway), after this branch is deployed:

1. set `OPENAI_API_KEY` (owner, secret);
2. set `AI_PROVIDER=openai`, `AI_MODEL_DEFAULT=<OpenAI model id>` (the Azure deployment name
   `gpt-6.1-sol` must be checked against the models the key can use);
3. optionally `STT_PROVIDER=openai`, `STT_MODEL=<transcription model>` (else Google STT stays);
4. redeploy runtime → startup validation is strict (AI_PROVIDER set): missing key / unknown provider /
   capability mismatch → the new deployment refuses to start, the previous one keeps serving;
5. check `GET /v1/runtime/ai-health` and run `python -m tools.benchmark.run` with the same variables;
6. rollback: unset `AI_PROVIDER` (legacy Azure config still present) or set `AI_PROVIDER=azure`.

## 8. Evidence

Runtime suite 218/218 (incl. `tests/test_provider_agnostic.py`, 20 tests: registry, config, validation,
switch, 10 error codes, usage, cancellation, fallback, budget, STT switch, coupling guard, Agno-path
regressions); process-level switch acceptance 13/13 (`scripts/production/provider-switch-acceptance.mjs`);
real-provider benchmark through the new layer (Azure + Google STT) — `E2E_TEST_REPORT.md`.

## 9. Remaining vendor coupling (counted)

| #   | Where                                                                                     | Why kept                                                                                          |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | `backend` job state literal `uploading_to_google` (job-service, worker, 2 frontend types) | persisted state value; renaming needs a data migration + frontend change (cosmetic, no behaviour) |
| 2   | `env_config.py` legacy resolvers (`AGNOS_LLM_*`, `AZURE_OPENAI_DEPLOYMENT`)               | backward-compatible legacy mode; inside the config layer                                          |
| 3   | `profiles.py` per-provider capability heuristics                                          | configuration data referenced by the registry entries                                             |

Business layers (agents, api, domain, voice layer, contract, configuration, registry, factory,
validation) contain **zero** vendor names — enforced by `CouplingGuardTests`.

## 10. Phase 9B status (2026-10-02)

Target Railway configuration (`RAILWAY_OPENAI_CONFIGURATION.md`): openai / gpt-5.6-luna (FAST,
COMMAND_PARSER, SUMMARY, VISION) / gpt-5.6-sol (REASONING) / gpt-transcribe (STT), realtime separate
and off. Verified against the stub with the real adapter (role→model mapping observed on the wire,
switch openai→test→openai, STT switch, runtime AI-off: 32/32) and by `tests/test_openai_cutover.py`.
Real OpenAI calls pending `OPENAI_API_KEY`.
