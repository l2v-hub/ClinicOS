# Task Contract

## Task
- Title: Phase 9 provider agnostic AI
- Slug: phase-9-provider-agnostic-ai
- Type: change
- Date: 2026-10-02

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | yes |
| Database/Persistence | no |
| Agnos AI / Chatbot | yes |
| Voice | yes |
| OCR / Import | yes |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

The AI runtime selects models per legacy scope (AGNOS_LLM_* for the agent, AI_EXTRACTION_* for extraction, AI_REPAIR_MODEL, AI_STT_MODEL) with Azure OpenAI as primary; adding a provider requires edits in 5 runtime files (spec, factory, registry, env_config, profiles); errors are partially normalized (no AUTH/CONTEXT_LIMIT/CONTENT_REJECTED/CANCELLED), usage is not captured for LLM calls, STT providers are if/else branches inside voice/stt.py, there is no OpenAI STT and no fake provider for switch tests. The backend keeps a dead Gemini SDK provider and gates AI import availability on GEMINI_API_KEY.

## Expected Behaviour

One provider registry and one switch (AI_PROVIDER + AI_MODEL_<ROLE>, STT_PROVIDER + STT_MODEL); logical model roles; AIProvider / STT contracts with normalized AIResponse, Usage and error taxonomy; OpenAI API Direct adapter (Responses API, transcription) as primary; a deterministic test provider; agents, skills, tools, UI, authorization unchanged and vendor-free; legacy Azure configuration still works; backend vendor-free with an AI_ENABLED master switch.

## Acceptance Criteria

- AC1: AIProvider and STT contracts, provider registry (single file), normalized errors and usage exist and are used by every runtime call path.
- AC2: logical roles resolve models from configuration only; no model names in agents/skills/tools/UI/backend code.
- AC3: OpenAI Direct adapter (Responses API + transcription) is the configured primary; Azure/Gemini/mock remain available.
- AC4: provider switch test PASS: openai → test by configuration only, same workflows succeed, no code change.
- AC5: adding a provider = adapter + registry entry + config + tests (documented and demonstrated by the test provider).
- AC6: config validation fails fast on incoherent new-style config; AI failures degrade safely; AI_ENABLED=false keeps the classic GUI working.
- AC7: benchmark harness provider-independent; cost/usage baseline; full regression without new failures; docs + PROMPT10_HANDOFF.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | contract, registry, config, error/usage normalization |
| Integration | yes | provider switch with real processes |
| API | yes | runtime endpoints return normalized metadata |
| Playwright | yes | AI-off GUI + browser regression |
| Persistence after refresh | no | |
| Agnos action registry | yes | skill routing via the new layer |
| Voice simulation | yes | STT registry + voice regression |
| OCR/import test | yes | extraction (vision role) unchanged |
| Security/privacy scan | yes | secrets only server-side, logs |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

Breaking the live Azure configuration → legacy resolution kept and tested. Real OpenAI not testable until the owner sets OPENAI_API_KEY → adapter tested against an OpenAI-compatible stub server; real smoke documented as pending.

## Gate Status

READY FOR IMPLEMENTATION
