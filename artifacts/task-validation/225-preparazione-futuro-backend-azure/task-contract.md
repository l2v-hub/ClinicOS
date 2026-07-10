# Task Contract

## Task
- Title: 225 Preparazione futuro backend Azure (config principles, no deploy)
- Issue: #225 — https://github.com/l2v-hub/ClinicOS/issues/225
- PR: #251 — https://github.com/l2v-hub/ClinicOS/pull/251 (branch `fix/issue-225-azure-principles` → `main`)
- Slug (canonical): `225-preparazione-futuro-backend-azure`
- Type: docs
- Date: 2026-07-10
- Parent program: #159 · Area: Privacy security Azure · Priority: P2

## Impact Classification

| Area | Impacted | Note |
|---|---:|---|
| Frontend/UI | no | No component/route touched |
| Backend/API | no | No route/controller/service touched |
| Database/Persistence | no | No schema/migration touched |
| Agnos AI / Chatbot | no | Doc references existing provider adapters, does not modify them |
| Voice | no | |
| OCR / Import | no | |
| Auth / Permissions | no | |
| Privacy / Security | no | Doc reaffirms existing invariants (no PHI/secrets in logs); no code change |
| Config / Env | no | Doc describes the existing env model; does not add/rename/remove any env var |
| Docs | yes | New file `docs/azure-backend-config-principles.md` (85 lines) |

## Current Behaviour

ClinicOS backend today runs on Railway. Configuration for the AI/LLM layer is spread across
several env-var families with no single document explaining the model or how it would carry
over to a different cloud (Azure): `AGNOS_LLM_PROVIDER` / `AGNOS_LLM_MODEL` / `AGNOS_LLM_TEMPERATURE`
/ `AGNOS_LLM_MAX_TOKENS` / `AGNOS_LLM_TIMEOUT_MS` / `AGNOS_LLM_STREAMING_ENABLED` (Agnos chatbot
reasoning), `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_DEPLOYMENT` / `AZURE_OPENAI_API_KEY` /
`AZURE_OPENAI_API_VERSION` (Azure OpenAI provider, verified working end-to-end in #239),
`AI_OCR_PROVIDER` / `AI_OCR_MODEL` + `MISTRAL_API_KEY` / `MISTRAL_OCR_URL` (OCR), `AI_EXTRACTION_PROVIDER`
/ `AI_EXTRACTION_MODEL` (extraction), and `AI_RUNTIME_URL` / `AI_RUNTIME_SERVICE_TOKEN` / retry/timeout/
concurrency knobs (runtime). Secrets live in Railway variables. No document governs how this model
would migrate to an Azure-hosted backend, so a future migration risked becoming an ad-hoc code
rewrite instead of a configuration change.

## Expected Behaviour

A principles document (`docs/azure-backend-config-principles.md`) exists that: (1) documents the
env/secret model per domain and where secrets are custodied today (Railway) vs. in a future Azure
deployment (Azure Key Vault referenced from App Service/Container Apps settings); (2) documents
that provider dependencies are swappable via env only (adapter pattern under
`clinicos_ai/models/providers/*`), so moving the Agnos LLM provider to Azure requires no code
change; (3) states explicitly that no production deploy is performed by this document — production
keeps running on Railway until a future, separately QA-approved cutover. The document must not
change any runtime behaviour, schema, API, or env value.

## Acceptance Criteria (from issue #225, verbatim)

- **AC1: Env/secret model is documented.**
  Asserted by: `docs/azure-backend-config-principles.md` §"1. Env / secret model (AC1)" — lists
  every env-var family (Agnos, Azure provider, OCR, extraction, runtime) and states secret custody
  (Railway today, Azure Key Vault for a future Azure backend); Playwright remediation spec
  (`e2e/remediation/issue-225.spec.ts`) asserts the heading `1. Env / secret model (AC1)` is
  visible in the rendered doc.
- **AC2: Provider dependencies remain swappable.**
  Asserted by: §"2. Provider dependencies remain swappable (AC2)" — provider is an env value
  (`provider:model_id` / `AGNOS_LLM_PROVIDER`), adapters live under `clinicos_ai/models/providers/*`,
  swap = env + credentials change, no code change; Playwright spec asserts heading
  `2. Provider dependencies remain swappable (AC2)` is visible.
- **AC3: No production deploy is performed.**
  Asserted by: §"4. Future Azure migration checklist (no action now — AC3)" — explicit statement
  "no action now"/"This document performs no deploy"; Playwright spec asserts the AC3 checklist
  heading is visible AND independently: no deploy commands were run by this remediation (git log /
  commit history for this branch contains only doc/evidence changes, verified below).

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | No backend/frontend logic touched |
| Integration | no | No service touched |
| API | no | No route touched |
| Playwright (doc-render QA surface) | yes | This is a docs-only issue with no product UI. Compliant QA surface per `parallel-evidence-remediation`: a Playwright spec reads `docs/azure-backend-config-principles.md` via Node `fs`, renders it into a minimal styled page via `page.setContent()`, and asserts the AC1/AC2/AC3 section headings are visible — this is objective, automatable proof the deliverable exists, is readable, and covers all three ACs, without inventing a fake product screen. |
| Backend build | yes | Codex asked to "package build/verification output"; even though no backend code was touched, running `npm --prefix backend run build` and capturing its tail proves zero regression was introduced by this remediation and gives Codex a concrete build artifact under the canonical evidence dir (`build-output.txt`). |
| Persistence after refresh | no | No data is created/updated by this issue |
| Agnos action registry | no | Not touched |
| Voice simulation | no | Not touched |
| OCR/import test | no | Not touched |
| Security/privacy scan | no | No secrets touched; doc reaffirms existing invariants only |

## Risks

- The document's description of "current Railway config" could drift from the real Railway env
  over time (e.g., if a var is renamed/removed). Mitigation: the document explicitly cross-references
  the concrete variables verified end-to-end in issue #239 (Azure OpenAI endpoint/api-version
  gotchas), so any future drift is discoverable by re-checking that issue's evidence rather than by
  trusting this doc blindly.
- A doc-render Playwright test only proves the file exists and parses as expected headings — it does
  not (and cannot) prove production Railway env matches the doc. This is disclosed here and in the
  validation report rather than glossed over.
- CI on PR #251 shows two failing/unstable checks: `Build and Deploy Job` (Azure Static Web Apps) and
  `browser-e2e`. See `validation-report.md` CI Disposition section for root-cause analysis and why
  neither blocks this docs-only change.

## QA surface chosen

Doc-render Playwright test (`e2e/remediation/issue-225.spec.ts`): loads
`docs/azure-backend-config-principles.md` from disk, injects its content into a styled HTML page via
`page.setContent()`, and asserts the AC1/AC2/AC3 section headings render and are visible, plus a
final full-page screenshot saved to the canonical `screenshots/result.png`. No production code path
is exercised because none exists for this issue (docs-only).

## Gate Status

READY FOR IMPLEMENTATION (evidence packaging only — no application code touched)
