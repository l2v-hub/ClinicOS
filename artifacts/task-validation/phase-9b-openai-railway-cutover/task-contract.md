# Task Contract

## Task
- Title: Phase 9B OpenAI Railway cutover
- Slug: phase-9b-openai-railway-cutover
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
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

The provider-agnostic runtime exists (Prompt 9) but production still runs the legacy Azure configuration (AGNOS_LLM_* azure, STT google); OPENAI_API_KEY is not set on Railway; no USD soft budgets, no realtime-STT separation, no deprecated-model guard, AI_ENABLED only in the backend, no ready-to-run OpenAI smoke tools.

## Expected Behaviour

Configuration contract for OpenAI Direct on Railway (AI_PROVIDER=openai, AI_MODEL_FAST/COMMAND_PARSER/SUMMARY=gpt-5.6-luna, AI_MODEL_REASONING=gpt-5.6-sol, STT_PROVIDER=openai, STT_MODEL=gpt-transcribe, realtime separate and off), key only server-side, no Azure dependency on the LLM/STT path, soft USD budgets + cost telemetry, AI_ENABLED honoured by runtime too, smoke tools, docs; real cutover executed when the owner provides OPENAI_API_KEY.

## Acceptance Criteria

- AC1: target Railway variable set validates with the new runtime; OpenAI path has no Azure dependency; key never client-side or logged.
- AC2: role mapping luna/sol from configuration only; STT gpt-transcribe; realtime separate and disabled; deprecated transcription model flagged.
- AC3: provider switch openai→test→openai and STT switch PASS with the exact target configuration (stub for OpenAI).
- AC4: AI_ENABLED=false: no AI/STT call, classic GUI works; OpenAI failure tests normalized.
- AC5: cost telemetry (tokens, role, model, STT seconds, estimated USD) + soft budgets; smoke tools; docs + handoff; regression.
- AC6: real OpenAI text/STT smoke + Railway cutover executed, or honestly external-blocked (OPENAI_API_KEY).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | config, budgets, realtime/deprecation guards |
| Integration | yes | process-level E2E with target config |
| API | yes | runtime/backend endpoints |
| Playwright | no | |
| Persistence after refresh | no | |
| Agnos action registry | yes | command parser via new role mapping |
| Voice simulation | yes | STT path + switch |
| OCR/import test | no | |
| Security/privacy scan | yes | key exposure, logs |

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

Setting AI_PROVIDER=openai on Railway without the key would make the new runtime refuse to start (strict mode) → variables applied only together with the key. Model ids gpt-5.6-luna / gpt-5.6-sol / gpt-transcribe come from the owner and can only be verified with the key.

## Gate Status

READY FOR IMPLEMENTATION
