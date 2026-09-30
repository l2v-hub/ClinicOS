# Task Contract

## Task

- Title: Runtime capabilities for gpt-6.1-sol
- Slug: runtime-capabilities-for-gpt-6-1-sol
- Type: bugfix
- Date: 2026-09-30
- Source: user report 2026-09-30 — document scan fails with "Elaborazione non riuscita. Le altre pagine sono conservate."; user asks to use the newly deployed Azure model `gpt-6.1-sol` on the same endpoint.
- Branch: `fix/runtime-gpt6-capabilities` (from origin/main e75e6c98)

## Impact Classification

| Area                 |                                                                                                                                                                                 Impacted |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| Frontend/UI          |                                                                                                                                                                                       no |
| Backend/API          |                                                                                                                                                                                       no |
| Database/Persistence |                                                                                                                                                                                       no |
| Agnos AI / Chatbot   |                                                                                                                                                      yes (runtime model now gpt-6.1-sol) |
| Voice                |                                                                                                                                                                                       no |
| OCR / Import         |                                                                                                                                                    yes (extraction role capability gate) |
| Auth / Permissions   |                                                                                                                                                                                       no |
| Privacy / Security   |                                                                                                                                                                                       no |
| Config / Env         | yes (Railway: runtime AGNOS_LLM_MODEL/AI_EXTRACTION_MODEL/AI_REPAIR_MODEL/AZURE_OPENAI_DEPLOYMENT and backend AI_ASSISTANT_PLAN_MODEL/COMPOSE_MODEL → gpt-6.1-sol, done on user request) |

## Current Behaviour

Root cause 1 (config, fixed on Railway): runtime and backend pointed to Azure deployments `gpt-5.5` / `gpt-5.4-mini`, which no longer exist on the resource → 404 DeploymentNotFound → every extraction job `failed` → "Elaborazione non riuscita".
Root cause 2 (code): `clinicos_ai/models/profiles.py#capabilities_for` recognises image+PDF input only for model ids containing "gpt-5"; `azure:gpt-6.1-sol` is treated as text-only → extraction jobs fail with `kind: capability` ("mancano image_input, pdf_input").

## Expected Behaviour

GPT family ≥ 5 (gpt-5.x, gpt-6.x, …) on openai/azure/openai-like is vision + PDF capable; the extraction gate accepts `azure:gpt-6.1-sol`; older models unchanged.

## Acceptance Criteria

- AC1: `capabilities_for(azure:gpt-6.1-sol)` → image_input and pdf_input True; extraction requirement met.
- AC2: gpt-5.x unchanged (True), gpt-4o unchanged (image True, pdf False), gpt-4.1 unchanged.
- AC3: runtime test suite green; after deploy, a synthetic document job on production reaches `review_ready` with the expected content.

## Test Plan

| Test type                 | Required | Reason                                                      |
| ------------------------- | -------: | ----------------------------------------------------------- |
| Unit                      |      yes | capabilities_for matrix                                     |
| Integration               |      yes | runtime test suite                                          |
| API                       |      yes | production runtime synthetic document job (no patient data) |
| Playwright                |       no | no UI change                                                |
| Persistence after refresh |       no |                                                             |
| Agnos action registry     |       no |                                                             |
| Voice simulation          |       no |                                                             |
| OCR/import test           |      yes | synthetic job end-to-end                                    |
| Security/privacy scan     |       no | synthetic data only, keys never printed                     |

## Evidence Plan

Required evidence:

- validation-report.md
- runtime test output
- production synthetic job output (sanitized)

## Risks

- Assumes future GPT majors keep multimodal input: verified live for gpt-6.1-sol (image + PDF).

## Gate Status

READY FOR IMPLEMENTATION
