# Phase 5 — Current state (Voice & Realtime)

Status: see `.ai-architecture/CURRENT_STATE.json` (`phase_status`) and the quality gate
`artifacts/task-validation/phase-5-voice-realtime/validation-report.md`.

## What exists

| Area                  | Status                                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voice entry point     | Mic button «Parla» in the AI Assistant composer (`VoiceMicButton`, `data-testid am-mic`) + voice panel (`am-voice`)                                                                      |
| Push-to-talk          | Implemented: tap to talk, auto end of turn by VAD, «Fine» to close early, «Annulla» to drop                                                                                              |
| Audio state machine   | `IDLE → LISTENING → SPEECH_ACTIVE → TRANSCRIBING → TRANSCRIPT_READY → PROCESSING → AWAITING_CONFIRMATION → COMPLETED / ERROR / CANCELLED`                                                |
| VAD                   | Client-side energy VAD with adaptive floor, pre-roll, end-of-turn, max length, no-speech timeout; configurable via `VOICE_VAD_*`                                                         |
| STT                   | Provider-neutral contract (backend) + runtime adapter: `google` (verified with `gemini-3.5-flash-lite`), `azure` (implemented, not provider-tested: no transcription deployment), `mock` |
| Transcript UX         | Shown and editable; Invia / Ripeti / Scrivi a mano / Annulla; no semantic correction                                                                                                     |
| Assistant integration | `submitText(text, 'voice')` → Phase 4 path; `inputChannel:'voice'` for audit                                                                                                             |
| Confirmation          | Phase 4 policy v2 unchanged; spoken «conferma» refused                                                                                                                                   |
| TTS                   | Optional, off by default, fixed status phrases only, mute/stop                                                                                                                           |
| Session mode          | Not implemented (optional; push-to-talk is the default)                                                                                                                                  |
| Privacy               | Audio in memory only; audit without text; per-environment switch `VOICE_CHANNEL_ENABLED` (default off)                                                                                   |
| Deployment            | Code deployable; voice **disabled** in demo and production until the owner enables it                                                                                                    |

## Evidence

- `E2E_TEST_REPORT.md`, `evidence/voice-browser-e2e.json` (78/78), `evidence/screens/*.png`
- `evidence/stt-provider-check-run1.json` (22/22), `-run2.json` (21/22, 1 provider timeout)
- `evidence/regression-assistant-text-e2e.json` (46/46)

## Documents

VOICE_ARCHITECTURE.md · AUDIO_SESSION_STATE.md · TRANSCRIPT_CONTRACT.md ·
VOICE_CONFIRMATION_RULES.md · PRIVACY_AND_DATA_FLOW.md · PERFORMANCE_AND_COST.md ·
E2E_TEST_REPORT.md · PROMPT6_HANDOFF.md
