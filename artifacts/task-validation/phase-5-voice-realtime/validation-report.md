# Task Validation Report

## Task

- Title: Phase 5 voice realtime
- Slug: phase-5-voice-realtime
- Commit: branch feat/phase5-voice (see PR)
- Date: 2026-10-01

## Implementation Summary

Voice as a channel of the Phase 4 AI Assistant. Push-to-talk mic in the Assistant composer with an
evident state machine (IDLE → LISTENING → SPEECH_ACTIVE → TRANSCRIBING → TRANSCRIPT_READY →
PROCESSING → AWAITING_CONFIRMATION → COMPLETED/ERROR/CANCELLED); client-side energy VAD (silence,
steady noise and too-short sounds never leave the device); 16 kHz WAV utterance →
`POST /skills/voice/transcribe` (operator auth, `voice.plan` capability, per-environment
`VOICE_CHANNEL_ENABLED`, WAV only, 2 MiB, 20/min STT limit, PHI-free audit) → provider-neutral
`SpeechToTextProvider` → AI runtime STT adapter (`AI_STT_MODEL`: google verified, azure implemented,
mock). The transcript is shown and editable (Invia / Ripeti / Scrivi a mano / Annulla) and then
enters the unchanged Phase 4 path via `submitText(text, 'voice')` (`inputChannel:'voice'` for audit
only). A spoken «conferma» never confirms. Optional TTS of fixed status phrases (off by default).
Voice ships disabled in every environment (privacy decision on the STT provider pending).

## Files Changed

backend/src/voice/* (new), backend/src/skills/{http,engine,index,types,interpreter}.ts,
backend/src/ai/rate-limit.ts; clinicos-ai-runtime/clinicos_ai/voice/* (new),
clinicos_ai/api/app.py, tests/test_voice_stt.py (new); frontend/src/components/assistant/voice/*
(new), AssistantMode.{tsx,css}, assistantApi.ts, assistantState.ts (+test); scripts/voice/* (new:
fixtures, generators, provider check, browser E2E, seed); .ai-architecture/phase-5-voice/*,
.ai-architecture/CURRENT_STATE.json. No Prisma schema change, no new API outside `/skills/voice/*`
and the runtime `/v1/voice/*`.

## Acceptance Criteria Result

| AC  | Result | Evidence                                                                                                                                                              |
| --- | -----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 |   PASS | state machine unit tests; browser A (state sequence in data-state), mic evident (screens), phone layout                                                               |
| AC2 |   PASS | VAD unit tests (silence, steady noise, click, pauses, speech at the tap); browser J: 0 requests for silence / steady noise                                            |
| AC3 |   PASS | `SpeechToTextProvider` contract + runtime adapter; backend client tests; real Gemini provider check 22/22 and 21/22 (1 provider timeout, typed 504)                   |
| AC4 |   PASS | browser A (nothing sent before «Invia»), E (correction used), F (cancel), I («Scrivi il messaggio» fallback)                                                          |
| AC5 |   PASS | browser E2E A–M 78/78 with real STT + real Agno; backend voice 10/10; text Assistant regression 46/46; classic GUI (M)                                                |
| AC6 |   PASS | PRIVACY_AND_DATA_FLOW.md, PERFORMANCE_AND_COST.md (measured latency + tokens), E2E_TEST_REPORT.md tablet checklist; hardware/provider tests not run listed explicitly |

## Test Results

| Test             | Result | Evidence                                                                                                                                                                |
| ---------------- | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit             |   PASS | frontend voice 20/20 (+ assistantState), runtime voice 7/7 (runtime 183/183)                                                                                            |
| Integration      |   PASS | backend voice-e2e 10/10; skills-unit + skills-e2e + assistant-e2e + voice 44/44                                                                                         |
| API              |   PASS | real provider check (runtime → Gemini) 22/22 and 21/22                                                                                                                  |
| Playwright       |   PASS | voice browser E2E 78/78 (real STT + Agno, 0 console errors); Phase 4 text E2E 46/46                                                                                     |
| Persistence      |   PASS | DB write counts verified directly in Postgres in every write scenario                                                                                                   |
| Agnos AI         |   PASS | Agno skill-route (azure gpt-6.1-sol) interpreted the voice turns                                                                                                        |
| Voice simulation |   PASS | Chromium fake mic + WAV fixtures (speech, silence, steady noise, noise burst, no leading silence)                                                                       |
| OCR              |     NA |                                                                                                                                                                         |
| Security/privacy |   PASS | independent QA: round 1 FAILED VALIDATION (H1, M2–M4, L5–L9) → fixed → round 2 READY FOR QA; residual LOWs fixed or documented                                          |
| Regression       |   PASS | backend full serial fresh DB 1596 tests, 21 fails in 14 files all in the Phase 4 baseline (0 new); frontend 998 tests, 9 baseline fails (0 new); builds/tsc/eslint pass |

## Runtime Evidence

`.ai-architecture/phase-5-voice/evidence/` — voice-browser-e2e.json (78/78), screens/*.png,
stt-provider-check-run1.json, stt-provider-check-run2.json, regression-assistant-text-e2e.json.

## Not verified (declared, not claimed)

- Tablet / hardware microphones, real human voices (manual checklist in E2E_TEST_REPORT.md).
- Azure transcription (no deployment in the resource).
- Hosted voice latency on Railway (voice disabled in demo/production by design, pending decision).

## Final Decision

Final Decision: CLOSED — VERIFIED
