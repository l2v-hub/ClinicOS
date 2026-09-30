# Phase 5 — Voice architecture

Voice is a **channel** on top of the Phase 4 AI Assistant. It adds no business layer, no second
interpreter, no new permission system: after the user has reviewed the transcript, voice enters the
same `submitText(text, source)` the keyboard uses.

```
Microphone (explicit tap «Parla»)
  → getUserMedia (echoCancellation, noiseSuppression, autoGainControl, mono)
  → AudioContext frame tap (2048 samples)                    frontend/src/components/assistant/voice/useVoiceCapture.ts
  → client VAD (energy, adaptive noise floor, pre-roll,       voice/vad.ts   ← silence/noise/too-short never leave the device
                end-of-turn silence, max length, no-speech timeout)
  → ONE utterance → 16 kHz mono PCM16 WAV                     voice/wav.ts
  → POST /skills/voice/transcribe (audio/wav body, ≤ 2 MiB)   backend/src/skills/http.ts
      requireOperator → requireAuthorizationContext → voice STT rate limit
      → capability voice.plan (Phase 2 policy) → VOICE_CHANNEL_ENABLED → content validation
      → SpeechToTextProvider.transcribe(audio, 'it-IT')      backend/src/voice/stt.ts (runtime client)
      → POST {AI_RUNTIME_URL}/v1/voice/transcribe (service token)
      → runtime STT adapter (AI_STT_MODEL provider:model)     clinicos-ai-runtime/clinicos_ai/voice/stt.py
      → Google Gemini generateContent (system instruction + inline audio) | Azure /audio/transcriptions | mock
      ← TranscriptResult {text, locale, confidence, timestamps, empty, metadata{provider, model, durationMs, roundTripMs, usage}}
      → audit voice:transcribe (channel voce, names/buckets only)
  → TRANSCRIPT_READY: transcript shown, editable (Invia / Ripeti / Scrivi a mano / Annulla)
  → «Invia» → submitText(text, 'voice') → POST /skills/converse {message, inputChannel:'voice', context}
  → Agno skill router (runtime /v1/assistant/skill-route; deterministic fallback)
  → Skill → Policy (capabilities) + Resident Access Scope → preview (previewId)
  → UI «Conferma» button (bound to previewId, payload, identity, resident, current policy)
  → Tool Layer → backend services → verified result → audit (skill:*:execute, input:voice on the request)
  → optional spoken status (TTS, off by default, fixed phrases only)
```

## Components

| Layer           | File / symbol                                                                 | Responsibility                                                                               |
| --------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Audio session   | `voice/audioSession.ts` `audioReducer`                                        | Pure state machine (see AUDIO_SESSION_STATE.md)                                              |
| VAD             | `voice/vad.ts` `createVad`                                                    | Frame-level speech detection, end of turn, discard rules                                     |
| Encoding        | `voice/wav.ts` `utteranceToWav`                                               | Resample to 16 kHz, PCM16 WAV                                                                |
| Capture         | `voice/useVoiceCapture.ts`                                                    | Mic lifecycle; releases the mic after every utterance / cancel / tab hidden / unmount        |
| Channel         | `voice/useVoiceChannel.ts`                                                    | Wires capture → STT → review → `submitText`; maps Assistant outcomes back to the audio state |
| UI              | `voice/VoicePanel.tsx` `VoiceMicButton`, `VoicePanel`                         | Mic button (always shows state), level meter, transcript review, errors, TTS toggle          |
| API client      | `voice/voiceApi.ts`                                                           | `GET /skills/voice/status`, `POST /skills/voice/transcribe`                                  |
| TTS (optional)  | `voice/spokenStatus.ts`                                                       | speechSynthesis of fixed status phrases; mute/stop                                           |
| Backend route   | `backend/src/skills/http.ts` `/voice/status`, `/voice/transcribe`             | Auth, capability, limits, validation, audit                                                  |
| STT contract    | `backend/src/voice/stt.ts` `SpeechToTextProvider`, `createRuntimeSttProvider` | Provider-neutral contract + runtime client                                                   |
| VAD config      | `backend/src/voice/vad-config.ts`                                             | `VOICE_VAD_*` env → UI                                                                       |
| Runtime adapter | `clinicos-ai-runtime/clinicos_ai/voice/stt.py`                                | Provider selection, prompt, typed errors, sanitized logs                                     |

## Integration with the Phase 4 Assistant (no duplication)

- `AssistantMode.tsx` creates the channel with `useVoiceChannel({ residentId, busy, onSubmit: text => submitText(text, 'voice'), onSwitchToText })`.
- `send()` adds `inputChannel: 'voice'` for voice turns and reports every server outcome to the
  channel (`voiceTurn.current(status)`) so the mic state mirrors the workflow
  (AWAITING_CONFIRMATION / COMPLETED / ERROR / CANCELLED).
- Confirmation, modification, cancellation, resident picker, candidates and preview cards are the
  Phase 4 components, unchanged.
- The engine records `input:voice` on the request audit; it never changes interpretation, policy or
  confirmation (`ConverseRequest.inputChannel` is traceability only).

## Source independence (wearable-ready)

The backend contract is "one utterance": `audio/wav` body (other containers only once validated) + optional `X-Utterance-Ms` and
`X-Audio-Source` headers. The source label is only logged in buckets, never read by skills or Agno.
A clip-on / wearable device only needs to produce one utterance per push and call the same route
with the operator's session; nothing downstream knows the device.

## Per-environment enablement

`VOICE_CHANNEL_ENABLED=true` (backend) AND an STT model on the runtime (`AI_STT_MODEL`,
e.g. `google:gemini-3.5-flash-lite`) are both required. The runtime is shared by demo and
production, so the backend flag keeps voice off in an environment until someone decides to send its
audio to the STT provider (privacy decision). Default: OFF everywhere.

## Session mode (hands-free)

Not implemented, deliberately. Push-to-talk is the stable default (one utterance per tap, mic
released after each). The VAD, idle-timeout config (`VOICE_SESSION_IDLE_TIMEOUT_MS`) and the state
machine are ready for it; see PROMPT6_HANDOFF.md.
