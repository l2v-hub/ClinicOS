# Task Contract

## Task
- Title: Phase 9 production hardening
- Slug: phase-9-production-hardening
- Type: change
- Date: 2026-10-01

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | yes |
| Database/Persistence | no |
| Agnos AI / Chatbot | yes |
| Voice | yes |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

After Phase 8 the platform is demo-grade: identity is the Role Simulator (or Entra only where configured, AUTH_MODE unset in prod → clinical API 503); the simulator has a production override flag; no readiness probe, no request correlation, no metrics, console logs only; no startup validation of dangerous production configuration; no graceful shutdown; frontend never renews the Entra access token; simulator logout is client-side only; AI runtime compares the service token non-constant-time and echoes exception text in 500 bodies; no correlation id from backend to runtime.

## Expected Behaviour

Prompt 9: harden, don't redesign. Real identity (Entra JWT → operator mapping → same policy/scope) is the production identity source; the simulator is unreachable in a real production deployment; dangerous production config fails fast; request → Assistant → Agno → Skill → Tool → audit correlation via X-Request-Id; metrics endpoint (token-gated) with latency/status/AI/denial/fallback counters; /ready distinguishes readiness from liveness with no LLM call; AI degradation never breaks the classic GUI. No new product feature, no Prisma schema change.

## Acceptance Criteria

- AC1: production tier (CLINICOS_ENV=production or NODE_ENV=production without the synthetic demo marker) → simulator and demo headers disabled server-side regardless of flags; startup refuses conflicting config.
- AC2: identity always server-derived (Entra verified claims / signed simulator session); client-sent role/capability/scope ignored; authorization re-evaluated per request.
- AC3: sessions: Entra token renewed silently on the client; simulator logout revoked server-side; CORS/CSRF/cookie posture documented and tested.
- AC4: startup config validation with errors (fail fast in production) and warnings; secrets never in client/logs/repo (scan).
- AC5: AI/Agno/STT failures (timeout, 429, 5xx, malformed, down) degrade to deterministic/classic paths with no false success and no duplicate write; runtime returns generic errors and verifies the token in constant time.
- AC6: X-Request-Id correlation backend → runtime → audit; /metrics (token-gated) exposes request/AI/denial/fallback metrics without clinical data.
- AC7: /health liveness, /ready readiness (DB + policy, AI reported as degraded only), graceful shutdown.
- AC8: migrations deploy cleanly on a fresh DB; load baseline, concurrency, recovery tests executed; P1-P8 + classic GUI regression with no new failures.
- AC9: Phase 9 documents + PROMPT10_HANDOFF.md.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | config validation, tier gating, request id, metrics, token compare |
| Integration | yes | Entra JWT (local JWKS) end-to-end on clinical routes, readiness, recovery |
| API | yes | /ready, /metrics, simulator isolation, logout revocation |
| Playwright | yes | regression browser suites (assistant, voice, safety, proactive, copilot) + AI-off classic GUI |
| Persistence after refresh | yes | refresh mid-workflow / lost response after write |
| Agnos action registry | yes | runtime regression, correlation |
| Voice simulation | yes | voice browser regression, STT unavailable |
| OCR/import test | no | |
| Security/privacy scan | yes | secret scan, npm audit, redaction checks |

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

Fail-fast config could stop a production deploy whose env trips a new error → errors limited to genuinely dangerous combinations; prod env names checked before any merge. Simulator gating could break the demo env → demo keeps working via the existing synthetic-dataset marker. In-memory stores stay single-instance → documented scaling constraint.

## Gate Status

READY FOR IMPLEMENTATION
