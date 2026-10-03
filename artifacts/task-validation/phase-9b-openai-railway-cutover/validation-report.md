# Task Validation Report

## Task

- Title: Phase 9B OpenAI Railway cutover
- Slug: phase-9b-openai-railway-cutover
- Commit: not committed (working tree of `feat/phase9-hardening`)
- Date: 2026-10-02

## Implementation Summary

OpenAI Direct configuration contract for Railway: target variable set validated (found and fixed the
missing VISION role → `AI_MODEL_DEFAULT`), role mapping luna/sol from configuration, STT
`gpt-transcribe` with realtime kept separate and disabled (enabling it fails validation), deprecated
`gpt-4o-mini-transcribe` flagged, runtime honours `AI_ENABLED`, cost telemetry with configurable
price table and USD soft budgets (alert only), provider-agnostic `llm-health`, configurable STT
vocabulary hint, OpenAI smoke tool, process-level E2E with the exact target configuration, Railway
configuration document, runbook / privacy / handoff updates.

## Acceptance Criteria Result

| AC                                                                              |             Result | Evidence                                                                             |
| ------------------------------------------------------------------------------- | -----------------: | ------------------------------------------------------------------------------------ |
| AC1 target config valid, no Azure on the OpenAI path, key server-side only      |               PASS | `test_openai_cutover` (no AZURE_* in env), key-leak test, E2E `key_only_server_side` |
| AC2 luna/sol mapping, gpt-transcribe, realtime separate/off, deprecated flagged |               PASS | role→model observed on the wire (E2E 32/32), unit tests                              |
| AC3 provider switch openai→test→openai and STT switch                           |               PASS | E2E 32/32, unit 10/10                                                                |
| AC4 AI_ENABLED=false, failure normalization                                     |               PASS | E2E ai-off, unit, Phase 9 suites                                                     |
| AC5 cost telemetry + soft budgets, smoke tools, docs, regression                |               PASS | unit cost test, smoke 16/16 vs stub, backend 1710/0 new, runtime 228/228             |
| AC6 real OpenAI + Railway cutover                                               | BLOCKED (external) | `OPENAI_API_KEY` absent on Railway and locally                                       |

## Test Results

| Test             |                       Result | Evidence                                                                   |
| ---------------- | ---------------------------: | -------------------------------------------------------------------------- |
| Unit             |                         PASS | runtime 228/228 (venv + CI-identical env)                                  |
| Integration      |                         PASS | `test-results/provider-switch-acceptance.json` 32/32                       |
| API              |                         PASS | backend Phase 9 16/16                                                      |
| Playwright       |                NA this phase | browser suites from the provider-abstraction run (198/200, external quota) |
| Agnos AI         | PASS (stub) / BLOCKED (real) |                                                                            |
| Voice            | PASS (stub) / BLOCKED (real) |                                                                            |
| Security/privacy |                         PASS | key never in logs/responses; frontend has no provider variable             |

## Residual Risks

Real OpenAI behaviour (model availability, latency, cost) unverified until the key exists; OCR still
uses Mistral on the Azure resource by decision; branch not merged/deployed.

## Final Decision

PARTIAL
