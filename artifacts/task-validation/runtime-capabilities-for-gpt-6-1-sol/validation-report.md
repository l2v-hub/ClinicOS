# Task Validation Report

## Task
- Title: Runtime capabilities for gpt-6.1-sol
- Slug: runtime-capabilities-for-gpt-6-1-sol
- Commit: 73acc175 (PR #381, merged), deployed to Railway (workflow run 36693709238, success)
- Date: 2026-09-30

## Implementation Summary

Scan failure "Elaborazione non riuscita. Le altre pagine sono conservate." had two causes:
1. Config: Azure deployments `gpt-5.5` (runtime) and `gpt-5.4-mini` (backend assistant) no longer
   exist on the resource → 404 DeploymentNotFound (runtime logs). On user request all six
   variables now point to `gpt-6.1-sol` on the same endpoint (runtime: AGNOS_LLM_MODEL,
   AI_EXTRACTION_MODEL, AI_REPAIR_MODEL, AZURE_OPENAI_DEPLOYMENT; backend: AI_ASSISTANT_PLAN_MODEL,
   AI_ASSISTANT_COMPOSE_MODEL = azure:gpt-6.1-sol). OCR unchanged (mistral-ocr-4-0).
2. Code: `capabilities_for` recognised image/PDF only for ids containing "gpt-5" → extraction
   jobs with gpt-6.1-sol failed with `kind: capability`. Now the GPT family is recognised by
   major version (>= 5); older models unchanged.

## Files Changed

- `clinicos-ai-runtime/clinicos_ai/models/profiles.py`
- `clinicos-ai-runtime/tests/test_azure_gpt5.py`

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 gpt-6.1-sol image+PDF, extraction gate met | PASS | `test_gpt6_family_is_vision_and_pdf`; live probe: image and PDF answered correctly |
| AC2 older models unchanged | PASS | `test_older_azure_models_unchanged` (gpt-4o, gpt-4.1) |
| AC3 runtime suite + production end-to-end | PASS | 170/170 (`runtime-tests.log`); production synthetic job: OCR review_ready (mistral) → extraction review_ready (azure:gpt-6.1-sol) with Ramipril, Furosemide, penicillina, scompenso (`production-e2e.txt`) |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | runtime unittest 170/170 |
| Integration | PASS | CI `AI Runtime Tests` green on PR #381 |
| API | PASS | production runtime `/v1/assistant/llm-health` status ok, deployment gpt-6.1-sol |
| Playwright | NA | no UI change |
| Persistence | NA | |
| Agnos AI | PASS | llm-health ok on gpt-6.1-sol |
| Voice | NA | |
| OCR | PASS | synthetic end-to-end in production |
| Security/privacy | PASS | synthetic data only; keys read from Railway at runtime, never printed |

## Runtime Evidence

`production-e2e.txt`, `runtime-tests.log`.

## Logs

Only sanitized logs are allowed.

## Residual Risks

- Backend `AUTH_MODE` is unset in production (mode `disabled` → clinical endpoints 503): separate
  environment decision reported to the user, not changed here.
- `AI Import E2E Gate` stays red on 19 pre-existing backend tests (identical on main).

## Final Decision

CLOSED — VERIFIED
