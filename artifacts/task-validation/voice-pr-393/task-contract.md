# Task Contract

## Task
- Title: Reconcile PR #393 realtime voice with provider-neutral main
- Slug: voice-pr-393
- Type: feature
- Baseline: main 299ba8ff8d048631cdb969f26656d02de981da83
- Legacy source: PR #393 / 4eec7f9223edd69ce7b614752646c7ee1bb76e82
- Authorization: user requests all open PRs through analysis, implementation, isolated E2E, independent QA and GitHub review. No new paid resources or environment activation.

## Impact Classification
| Area | Impacted |
|---|---|
| Frontend/UI | yes: voice partial display and lifecycle |
| Backend/API | yes: bounded authenticated SDP negotiation |
| Database/Persistence | no schema/data changes; existing action confirmation remains |
| Agnos AI / Chatbot | yes: voice input only; text interpretation unchanged |
| Voice | yes |
| OCR / Import | no |
| Auth / Permissions | yes: reuse voice.plan and runtime bearer gates |
| Privacy / Security | yes: microphone, bounded requests, server-only credentials |
| Config / Env | yes: existing opt-in flags only; no environment writes |

## Current Behaviour
Main provides explicit STT_PROVIDER/STT_MODEL batch transcription and separate STT_REALTIME_ENABLED/STT_REALTIME_MODEL configuration, but no realtime negotiation route or partial display. Old PR #393 conflicts and would replace current provider defaults. Historical deployment-missing diagnosis is not current evidence.

## Expected Behaviour
Reconcile the optional Azure realtime WebRTC channel through the existing registry while preserving provider-neutral batch transcription and all feature-off defaults. Realtime is selected only by explicit runtime opt-in and supported configured provider/model; no silent batch/provider fallback. Existing server transport remains the current explicit STT_MODEL file-transcription contract, rather than restoring the superseded Azure-only default. Credentials and ephemeral token remain server-side; partial text is display-only; final text requires operator submission and the existing separate clinical confirmation. Missing/unsupported/disabled configuration has safe text fallback without provider calls.

## Acceptance Criteria
- AC1: Existing STT_PROVIDER/STT_MODEL, legacy prefixed AI_STT_MODEL and batch adapters remain unchanged. Realtime disabled by default, AI_ENABLED=false denies both paths; no environment flag is enabled.
- AC2: Realtime dispatch uses provider registry capability and STT_REALTIME_MODEL only. Unsupported, missing or disabled settings fail without network, no implicit provider/default model/fallback. Configuration availability is not successful provider proof.
- AC3: Authenticated and authorized, rate-limited backend SDP route validates MIME, UTF-8 byte bounds and content before provider access; runtime auth and streamed body bounds precede JSON parsing. Provider API key and ephemeral token never reach browser/logs/error bodies; redirects cannot forward credentials.
- AC4: Explicit mic gesture, permission-pending state, bounded connection and final wait, cancellation, resident change, hidden tab, unmount, provider failure or disconnect release mic/tracks/transport and reject stale work.
- AC5: Partials are display-only, bounded and never editable/submittable; only the committed final transcript can be submitted exactly once. Silence is never committed. Spoken confirmation cannot execute clinical actions; text Assistant remains unchanged.
- AC6: Focused Python, frontend and backend-client/route regressions plus independent frontend build/typecheck. Actual isolated browser evidence includes partial/final values, cancellation and text fallback, console/network errors, screenshots, video and trace. Mock transport is explicitly labelled and never real-provider transcription proof.
- AC7: Real-provider availability/transcription is reported only after an actual authorized synthetic-audio provider success. No paid deployment, provider provisioning, production database access or automatic activation. Missing positive proof is explicitly scoped, never converted to PASS.

## Test Plan
| Test type | Required | Reason |
|---|---|---|
| Unit | yes | parser, reducer, transport and registry/config invariants |
| Integration | yes | loopback HTTP client/provider and real WebRTC transport fixture |
| API | yes | bearer/authz, size/MIME bounds, disabled guard, sanitization |
| Playwright | yes | actual voice component/hook with synthetic media and labelled transport |
| Persistence after refresh | no | no new writes; existing action-confirmation tests retained |
| Agnos action registry | yes | existing converse/confirm policy tests unchanged |
| Voice simulation | yes | delayed final, cancel, no fallback, permission errors |
| OCR/import test | no | unrelated immutable domains |
| Security/privacy scan | yes | keys, SDP/audio/transcript logs, PHI, stale sessions |

## Evidence Plan
Packet includes analysis, executable plan, cycle ledger, sanitized test outputs and source manifest. Browser screenshot/video/trace are synthetic and labelled. Independent fresh QA session is required before publication. Exact source SHA and inherited versus newly executed checks remain separate.

## Gate Status
READY FOR IMPLEMENTATION — source cycle 1/4 reserved in implementation-ledger.json before source edits. Review 0/4; root owns publication and remote control state.
