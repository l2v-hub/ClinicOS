# Task Contract

## Task

- Title: Phase 5 voice realtime
- Slug: phase-5-voice-realtime
- Type: feature
- Date: 2026-09-30
- Source: `.ai-prompts/PROMPT_5_VOICE_REALTIME.md` (user request 2026-09-30); handoff `.ai-architecture/phase-4-assistant/PROMPT5_HANDOFF.md`
- Branch: `feat/phase5-voice` (from origin/main)

## Impact Classification

| Area                 |                                                                      Impacted |
| -------------------- | ----------------------------------------------------------------------------: |
| Frontend/UI          | yes (push-to-talk, mic state, transcript review inside the Phase 4 Assistant) |
| Backend/API          |              yes (`POST /skills/voice/transcribe`, authenticated, no storage) |
| Database/Persistence |                                          no (audit rows only, existing table) |
| Agnos AI / Chatbot   |              yes (runtime STT adapter `/v1/voice/transcribe`; Agno unchanged) |
| Voice                |                                                                           yes |
| OCR / Import         |                                                                            no |
| Auth / Permissions   |                 yes (voice channel gated by existing capability `voice.plan`) |
| Privacy / Security   |                     yes (audio in memory only, provider data flow documented) |
| Config / Env         |                                          yes (`AI_STT_MODEL`, VAD parameters) |

## Current Behaviour

The Phase 4 Assistant is text-only. The legacy Agnos panel uses the browser Web Speech API.

## Expected Behaviour

`Mic → client VAD → utterance (WAV) → backend → runtime STT adapter → transcript (shown, editable)
→ existing Assistant (submitText 'voice') → Agno → Skill → Policy + Resident Scope → preview →
UI confirmation → Tool → backend → verified result → audit`. Voice never confirms; silence/noise
never reaches STT or the LLM; any failure falls back to text.

## Acceptance Criteria

- AC1: push-to-talk with evident mic state and the audio state machine (IDLE … COMPLETED/ERROR/CANCELLED).
- AC2: client-side VAD discards silence / too-short utterances before any network call; configurable.
- AC3: STT abstraction `transcribe(audio, locale, context?) → TranscriptResult`, provider configurable (it-IT baseline).
- AC4: transcript review (correct / cancel / resend / switch to text) before it drives the Assistant.
- AC5: Prompt 5 §16 A–M pass (read, write with preview, ambiguous resident, prescription only prepared, correction, cancel, revocation, out-of-scope, STT failure, noise, duplicate submit, text Assistant and classic GUI regression).
- AC6: privacy/data flow, performance/cost, manual tablet checklist documented; hardware/provider tests not run are marked as such.

## Test Plan

| Test type                 | Required | Reason                                                                      |
| ------------------------- | -------: | --------------------------------------------------------------------------- |
| Unit                      |      yes | VAD, WAV encoder, audio state machine, STT contract, route validation       |
| Integration               |      yes | backend transcribe route + runtime adapter (fake + real provider)           |
| API                       |      yes | provider-dependent STT with synthetic speech fixtures (Windows it-IT voice) |
| Playwright                |      yes | Chromium fake microphone fed with WAV fixtures → real getUserMedia path     |
| Persistence after refresh |      yes | writes verified in Postgres                                                 |
| Agnos action registry     |       no | Agno unchanged                                                              |
| Voice simulation          |      yes | fixtures: speech, silence, noise                                            |
| OCR/import test           |       no |                                                                             |
| Security/privacy scan     |      yes | auth, limits, no audio persistence/logging                                  |

## Evidence Plan

Required evidence:

- validation-report.md
- test output (unit, integration, provider-dependent)
- browser E2E report + screenshots
- `.ai-architecture/phase-5-voice/E2E_TEST_REPORT.md`

## Risks

- Real device microphones / tablets cannot be tested here (manual checklist).
- STT provider availability/cost (Google Gemini via runtime); Azure transcription models are not deployed.

## Gate Status

READY FOR IMPLEMENTATION
