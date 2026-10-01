# Phase 5 — Current state (Voice & Realtime on Azure OpenAI `gpt-live-transcribe`)

Status: **BLOCKED** on one external dependency — the Azure deployment `gpt-live-transcribe` does not
exist in the Azure OpenAI resource (verified 2026-10-01). Everything else is implemented and tested;
real-Azure tests are marked BLOCKED, not PASS. See `artifacts/task-validation/phase-5-azure-gpt-live-transcribe/validation-report.md`.

| Area | Status |
| --- | --- |
| Voice entry point | «Parla» in the AI Assistant composer (`VoiceMicButton`) → `useVoiceChannel` → `submitText(text,'voice')` |
| STT provider | **`azure_openai` / `gpt-live-transcribe` (default)**; deployment configurable (`AI_STT_DEPLOYMENT`); same resource/endpoint/key as the AI runtime. Gemini only as explicit opt-in, never a fallback |
| Realtime transport | **WebRTC** browser ↔ Azure Realtime GA; SDP negotiation proxied by ClinicOS (`POST /skills/voice/realtime-call`): ephemeral session minted and used server-side, the browser gets only the SDP answer; server WebSocket transport for the utterance path |
| Push-to-talk | implemented: REQUESTING_PERMISSION → LISTENING → SPEECH_ACTIVE ⇄ TRANSCRIPT_PARTIAL → TRANSCRIBING → TRANSCRIPT_FINAL → PROCESSING → AWAITING_CONFIRMATION / COMPLETED / CANCELLED / ERROR |
| Partial transcripts | display-only (never submittable) — unit + browser (mock transport) verified |
| Final transcripts | after local-VAD commit; reviewed, then the Phase 4 Assistant path |
| VAD | client-side; silence/steady noise never committed; configurable `VOICE_VAD_*` |
| Health check | `GET /skills/voice/health` → `deployment_missing` today (clear message) |
| Failure | Azure failure → ERROR + «Scrivi il messaggio»; text Assistant unaffected (real-Azure E2E 5/5) |
| Deployment | voice still OFF per environment (`VOICE_CHANNEL_ENABLED`) |

Unblock: create the `gpt-live-transcribe` deployment, then run `scripts/voice/azure-stt-check.mjs`
and `scripts/voice/voice-realtime-e2e.mjs --mode azure` (see PROMPT6_HANDOFF.md §Unblock).

Documents: AZURE_REALTIME_CONFIGURATION.md · STT_PROVIDER_CONTRACT.md · VOICE_ARCHITECTURE.md ·
AUDIO_SESSION_STATE.md · TRANSCRIPT_CONTRACT.md · VOICE_CONFIRMATION_RULES.md ·
PRIVACY_AND_DATA_FLOW.md · PERFORMANCE_AND_COST.md · E2E_TEST_REPORT.md · PROMPT6_HANDOFF.md
