# Phase 9 — Current State (Production Hardening)

**Status: CONDITIONALLY READY** (2026-10-02). Branch `feat/phase9-hardening` from `origin/main`
f7b32b6d (Phase 8). Not merged, not deployed.

## Completion loop

ASSESS → HARDEN → TEST → OBSERVE → FIX → RETEST → FULL REGRESSION, in the order of Prompt 9 §32.

| #   | Area                  | Outcome                                                                                                                                                    | Doc                         |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Identity              | Entra JWT is the single production identity source through the existing gate; tested end-to-end with a local JWKS; **real IdP not provisioned (external)** | IDENTITY_AND_SESSION        |
| 2   | Simulator isolation   | deployment tier; never on tier production; startup refuses flags; HTTP-tested                                                                              | IDENTITY_AND_SESSION §3     |
| 3   | Sessions              | Entra silent renewal + MSAL cache cleared on logout; simulator server-side logout; CORS/CSRF posture tested                                                | IDENTITY_AND_SESSION §4–5   |
| 4   | Secrets/config        | inventory; no committed/client/log secrets; fail-fast validation checked against real prod/demo variable sets                                              | SECRETS_AND_CONFIGURATION   |
| 5   | Azure/Agno resilience | timeout/429/5xx/malformed/down → deterministic; runtime constant-time token + generic errors                                                               | AI_RESILIENCE               |
| 6   | Retry/timeouts        | classified; no interactive retries; `AI_MAX_RETRIES ≤ 5`; Agno budget configurable                                                                         | AI_RESILIENCE §4–5          |
| 7   | Observability         | X-Request-Id backend→runtime→audit link; JSON logs; token-gated Prometheus metrics                                                                         | OBSERVABILITY               |
| 8   | Privacy               | data map; structural redaction; organisational decisions listed                                                                                            | PRIVACY_AND_RETENTION       |
| 9   | Token/cost            | per-role context 1.7–3.2k chars; 0 AI calls from polling; 1 call per turn                                                                                  | PERFORMANCE_AND_COST_BUDGET |
| 10  | Migrations/deployment | 51/51 clean ×6; pre-existing index drift documented; clean start with real demo env                                                                        | DEPLOYMENT_AND_MIGRATIONS   |
| 11  | Concurrency           | duplicate/concurrent confirmations → 1 write; two operators → 2 writes; hijack refused                                                                     | E2E_TEST_REPORT §2          |
| 12  | Load                  | ~90 rps mixed, 0 % errors at c=10/40; limiter protects                                                                                                     | LOAD_TEST_REPORT            |
| 13  | Recovery              | 19/19 real-process drill ×2                                                                                                                                | E2E_TEST_REPORT §1          |
| 14  | Web/deps              | headers/CORS tested; `npm audit` 0 after patch bumps; no sourcemaps                                                                                        | E2E_TEST_REPORT §1          |
| 15  | Runbook               | written with real commands                                                                                                                                 | PRODUCTION_RUNBOOK          |
| 16  | Smoke/regression      | prod smoke: public endpoints only (authenticated steps NOT EXECUTED — no IdP); full regression see E2E §4                                                  | E2E_TEST_REPORT §4–5        |

## Change budget used

CONFIGURE (tier, flags, timeouts) → HARDEN (gates, validation, runtime auth) → WRAP (observability
middleware, instrumented runtime POST) → LOCAL REFACTOR (simulator token parsing). No rewrite, no new
product feature, no Prisma schema change, no new migration, no prompt change.

## External blockers

Entra provisioning (tenant/app/scope/user mapping); deployment + authenticated production smoke;
metrics/alerting backend; legal retention/residency decisions.

## Provider-agnostic AI / STT (Prompt 9 provider abstraction, 2026-10-02)

Status: **CONDITIONALLY READY**. Single provider registry + AI/STT contracts + logical roles + one switch
(`AI_PROVIDER`, `STT_PROVIDER`); OpenAI Direct adapter (Responses API, transcriptions) implemented and
contract-tested against an OpenAI-compatible stub; provider switch acceptance 13/13; backend vendor-free
with `AI_ENABLED`; legacy Azure config still valid (production variables: 0 errors). Pending (external):
`OPENAI_API_KEY` on the runtime service, then `AI_PROVIDER=openai` + real smoke/benchmark; Azure
deployment quota limits real-LLM regression (429). See `PROVIDER_ABSTRACTION.md`.
