# Task Validation Report

## Task

- Title: Phase 5 Azure gpt-live-transcribe
- Slug: phase-5-azure-gpt-live-transcribe
- Commit: branch feat/phase5-azure-live-transcribe (see PR)
- Date: 2026-10-01

## Implementation Summary

Azure OpenAI `gpt-live-transcribe` is the default STT (`AI_STT_PROVIDER=azure_openai`, model/deployment
configurable) on the same Azure OpenAI resource/endpoint/key as the AI runtime; Gemini is explicit
opt-in only, with no silent fallback. Realtime transport: browser WebRTC ↔ Azure Realtime GA
transcription session; the SDP negotiation is proxied by ClinicOS (backend `POST
/skills/voice/realtime-call` → runtime `negotiate_call`: ephemeral client secret minted and used
server-side → SDP answer only to the browser — no key, no token, no CSP change). Server WebSocket
transport (same deployment) for the utterance path. Push-to-talk states incl. REQUESTING_PERMISSION,
TRANSCRIPT_PARTIAL, TRANSCRIPT_FINAL; partials display-only; local VAD commits turns (model has no
server VAD); non-destructive health check with clear diagnostics; Azure failure → ERROR + text
fallback.

## Files Changed

clinicos-ai-runtime: `clinicos_ai/voice/azure_realtime.py` (new), `voice/stt.py`, `api/app.py`,
`requirements.txt`, `tests/test_voice_azure_realtime.py` (new); backend: `src/voice/stt.ts`,
`src/skills/http.ts`, `src/voice/__tests__/voice-e2e.test.ts`; frontend:
`components/assistant/voice/{realtimeTransport.ts (new), audioSession.ts, useVoiceCapture.ts,
useVoiceChannel.ts, VoicePanel.tsx, voiceApi.ts, spokenStatus.ts, __tests__/voice.test.ts}`,
`AssistantMode.{tsx,css}`; scripts: `voice/voice-realtime-e2e.mjs` (new), `voice/azure-stt-check.mjs`
(new), `voice-browser-e2e.mjs` (state rename); `.ai-architecture/phase-5-voice/*` (+2 new docs),
`CURRENT_STATE.json`. No Prisma schema change.

## Acceptance Criteria Result

| AC  |  Result | Evidence                                                                                                                                                                                                                                                         |
| --- | ------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |    PASS | provider selection tests (default azure_openai/gpt-live-transcribe, legacy opt-in, no fallback without Azure, unknown provider = unavailable); azure-missing E2E: 0 other-STT calls                                                                              |
| AC2 | PARTIAL | adapter implemented and unit-tested (mint, server-side SDP negotiation, real local WebSocket server protocol test, health + data-plane probe, diagnostics); **real Azure calls BLOCKED: deployment `gpt-live-transcribe` missing** (health `deployment_missing`) |
| AC3 |    PASS | state machine unit tests; browser mock C: partial shown, 0 Assistant requests, no send button; only TRANSCRIPT_FINAL submittable                                                                                                                                 |
| AC4 |    PASS | VAD unit tests; browser K: silence/steady noise never committed (0 commits), noise burst → empty → no command                                                                                                                                                    |
| AC5 | BLOCKED | Prompt §18: A, B BLOCKED (real Azure); C–I, K–N PASS (mock transport, real backend/Agno/DB/audit; labelled); J PASS on real Azure (deployment missing → diagnostic + text fallback)                                                                              |
| AC6 |    PASS | 12 artefacts incl. AZURE_REALTIME_CONFIGURATION.md, STT_PROVIDER_CONTRACT.md, PROMPT6_HANDOFF.md (unblock steps); CURRENT_STATE.json fields                                                                                                                      |

## Test Results

| Test             |  Result | Evidence                                                                                                                                                       |
| ---------------- | ------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |    PASS | runtime Azure 13 (+ voice STT), frontend voice 27                                                                                                              |
| Integration      |    PASS | backend voice 13; skills+voice 47/47                                                                                                                           |
| API (Azure)      | BLOCKED | `scripts/voice/azure-stt-check.mjs` → BLOCKED (`evidence/azure-stt-check.json`)                                                                                |
| Playwright       |   PASS* | mock realtime transport 34/34 (*Azure not used, labelled); real Azure failure path 5/5; text Assistant 46/46 (fresh DB)                                        |
| Persistence      |    PASS | DB write counts verified in every write scenario                                                                                                               |
| Agnos AI         |    PASS | real Agno (azure gpt-6.1-sol) interpreted the voice transcripts                                                                                                |
| Voice simulation |    PASS | Chromium fake mic + fixtures (speech, silence, steady noise, burst, no-lead)                                                                                   |
| OCR              |      NA |                                                                                                                                                                |
| Security/privacy |    PASS | independent QA: round 1 FAILED VALIDATION (H1 CSP, H2 mic after error, M1–M3, L1–L6) → fixed; round 2 code READY FOR QA with R1–R5 → fixed; round 3 READY FOR QA (one test lint error fixed, eslint clean) |
| Regression       |    PASS | backend full serial fresh DB 1599 tests, 21 fails in 14 baseline files (0 new); frontend 9 baseline fails (0 new); builds/tsc/eslint pass                      |

## Runtime Evidence

`.ai-architecture/phase-5-voice/evidence/`: voice-realtime-e2e-mock.json (34/34, MOCK transport),
voice-realtime-e2e-azure-missing.json (5/5, real Azure), azure-stt-check.json (BLOCKED),
regression-assistant-text-e2e.json (46/46), screens-realtime/*.png.

## Blocker

External: the Azure OpenAI resource has no `gpt-live-transcribe` deployment (verified 2026-10-01:
DeploymentNotFound; realtime routes 404; model available in the catalog as
`gpt-live-transcribe-2026-07-28`). Unblock: deploy it (Foundry → Deploy base model) or set
`AI_STT_DEPLOYMENT`, then run `azure-stt-check.mjs` and `voice-realtime-e2e.mjs --mode azure`.

## Final Decision

Final Decision: BLOCKED
