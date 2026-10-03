# Task Validation Report

## Task

- Title: Phase 9 provider agnostic AI
- Slug: phase-9-provider-agnostic-ai
- Commit: not committed (working tree of `feat/phase9-hardening`)
- Date: 2026-10-02

## Implementation Summary

Provider-agnostic AI/STT layer in the AI runtime: single provider registry, AI contract
(AIRequest/AIResponse/Usage, `generate()` gateway, budget, explicit fallback, telemetry), 10 normalized
error codes, logical model roles with one switch (`AI_PROVIDER` + `AI_MODEL_<ROLE>`), strict startup
validation, OpenAI API Direct adapter (Responses API) and OpenAI STT adapter, deterministic `test`
provider, STT registry, no hidden SDK retries, capability matrix generator, benchmark harness,
process-level switch acceptance script. Backend made vendor-free (dead Gemini SDK provider removed,
import availability = runtime configured, `AI_ENABLED` master switch, provider/role/token metrics).

## Acceptance Criteria Result

| AC                                                             |                       Result | Evidence                                                                              |
| -------------------------------------------------------------- | ---------------------------: | ------------------------------------------------------------------------------------- |
| AC1 contracts, registry, normalized errors/usage on every path |                         PASS | `tests/test_provider_agnostic.py`, agents migrated to `generate()`                    |
| AC2 logical roles, no model names in business code             |                         PASS | coupling guard test; backend has no model names                                       |
| AC3 OpenAI Direct adapter primary-ready                        | PASS (stub) / BLOCKED (real) | contract tests with official SDK vs stub; `OPENAI_API_KEY` not set                    |
| AC4 provider switch test                                       |                         PASS | in-process 20/20, process-level 13/13                                                 |
| AC5 new provider = adapter + registry + config + tests         |                         PASS | `test` provider added exactly that way; `PROVIDER_ABSTRACTION.md` §6                  |
| AC6 fail-fast config, safe degradation, AI_ENABLED=false GUI   |                         PASS | validation tests; AI-off GUI 15/15                                                    |
| AC7 benchmark, cost baseline, regression, docs                 |                         PASS | benchmark (real Azure + test), backend 1710/0 new, browser 198/200 (2 external), docs |

## Test Results

| Test             | Result | Evidence                                                                                                     |
| ---------------- | -----: | ------------------------------------------------------------------------------------------------------------ |
| Unit             |   PASS | runtime 218/218 (also CI-identical env)                                                                      |
| Integration      |   PASS | `test-results/provider-switch-acceptance.json` 13/13                                                         |
| API              |   PASS | backend Phase 9 16/16                                                                                        |
| Playwright       |  PASS* | browser suites on new runtime: 198/200 (*2 voice checks blocked by Azure RATE_LIMIT, external); AI-off 15/15 |
| Persistence      |   PASS | single commit asserted in switch acceptance                                                                  |
| Agnos AI         |   PASS | real Azure through the new layer (benchmark + browser)                                                       |
| Voice            |  PASS* | STT switch tests; real Google STT 5/5 benchmark                                                              |
| OCR              |   PASS | extraction/OCR suites in runtime regression (scope unchanged)                                                |
| Security/privacy |   PASS | no vendor secret in backend/frontend; labels/logs sanitized                                                  |

## Residual Risks

OpenAI Direct not exercised with a real key; Azure deployment quota too low for sustained use;
remaining vendor coupling 3 (persisted `uploading_to_google` state, legacy env resolvers, capability
heuristics) — documented in `PROVIDER_ABSTRACTION.md` §9.

## Final Decision

PARTIAL
