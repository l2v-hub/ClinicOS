# Phase 5 — Audio session state

## Current state machine (Azure realtime)

```
IDLE → REQUESTING_PERMISSION (mic permission + realtime session/connection)
     → LISTENING (only once audio actually reaches the STT) → SPEECH_ACTIVE
     ⇄ TRANSCRIPT_PARTIAL (delta received while speaking — display only, mic open)
     → TRANSCRIBING (turn committed, mic released; late deltas only update the provisional text)
     → TRANSCRIPT_FINAL (editable; the ONLY state from which «Invia» works)
     → PROCESSING → AWAITING_CONFIRMATION | COMPLETED | ERROR | CANCELLED
discarded (no speech / too short) → IDLE (no commit) · cancel / tab hidden / resident change → CANCELLED
```

New in this iteration: `REQUESTING_PERMISSION`, `TRANSCRIPT_PARTIAL`, `TRANSCRIPT_FINAL` (was
TRANSCRIPT_READY), `partial` text + `metrics.firstPartialMs`; `capturing()` helper. A final
transcript must arrive within 15 s of the commit (else `stt_timeout`). Unit tests:
`voice/__tests__/voice.test.ts` (25).

---

## Previous iteration (server transport, Gemini opt-in)

Source: `frontend/src/components/assistant/voice/audioSession.ts` (pure reducer, unit-tested in
`voice/__tests__/voice.test.ts`). The voice state is exposed as `data-state` on the mic button
(`am-mic`) and the voice panel (`am-voice`), and as a visible label (`AUDIO_STATE_LABELS`).

```
IDLE ──start──▶ LISTENING ──speech_start──▶ SPEECH_ACTIVE ──utterance──▶ TRANSCRIBING
  ▲               │  discarded(no_speech)       │ discarded(too_short)       │ transcribed(text)
  │               ▼                              ▼                            ▼
  └──────────── IDLE (+notice «non è stato inviato nulla»)            TRANSCRIPT_READY ──edit──▶ (same)
                                                                            │ submit («Invia»)
                              transcribed(empty) → IDLE (+notice)           ▼
                                                                        PROCESSING
                          Assistant outcome:  NEEDS_CONFIRMATION → AWAITING_CONFIRMATION
                                              COMPLETED → COMPLETED · CANCELLED → CANCELLED
                                              DENIED / FAILED / transport error → ERROR
                                              NEEDS_CLARIFICATION / CONTEXT_REQUIRED → IDLE
  any capture state ──cancel / tab hidden / Escape──▶ CANCELLED (mic released, audio dropped)
  TRANSCRIPT_READY/TRANSCRIBING/LISTENING ──resident changed──▶ CANCELLED (transcript discarded)
  mic/STT failure ──failed(code)──▶ ERROR (+ «Scrivi il messaggio» fallback)
```

| State                         | Mic open      | Network                        | UI                                                                |
| ----------------------------- | ------------- | ------------------------------ | ----------------------------------------------------------------- |
| IDLE                          | no            | —                              | «Parla» button                                                    |
| LISTENING                     | **yes**       | none (local VAD only)          | pulsing blue mic «Fine», level meter, «Annulla»                   |
| SPEECH_ACTIVE                 | **yes**       | none                           | same, «Ti sto ascoltando…»                                        |
| TRANSCRIBING                  | no (released) | 1 × `/skills/voice/transcribe` | «Trascrizione in corso…», «Annulla» (aborts, late answer ignored) |
| TRANSCRIPT_READY              | no            | none                           | editable transcript + Invia / Ripeti / Scrivi a mano / Annulla    |
| PROCESSING                    | no            | `/skills/converse`             | Assistant loading                                                 |
| AWAITING_CONFIRMATION         | no            | none                           | hint: confirmation only with the «Conferma» button                |
| COMPLETED / CANCELLED / ERROR | no            | none                           | notice; a new capture may start                                   |

Guards:

- `canStartCapture` refuses a new capture while audio or a request is in flight.
- `captureId` is incremented by every start/cancel/reset: a late STT answer for an older capture is ignored.
- `submit` works only in TRANSCRIPT_READY and once per transcript (`submitted` ref + reducer).
- `resident_changed` discards any pending capture/transcript: a transcript is never re-targeted.
- First Escape stops the mic / discards the transcript; the next Escape closes the Assistant.

VAD parameters (backend env → `GET /skills/voice/status` → client):

| Env                              | Default | Meaning                                                 |
| -------------------------------- | ------- | ------------------------------------------------------- |
| `VOICE_VAD_SPEECH_MARGIN_DB`     | 12      | dB above the adaptive noise floor that counts as speech |
| `VOICE_VAD_MIN_SPEECH_DB`        | -50     | absolute floor (dBFS)                                   |
| `VOICE_VAD_MIN_SPEECH_MS`        | 300     | shorter voiced time → discarded (`too_short`)           |
| `VOICE_VAD_END_SILENCE_MS`       | 900     | silence after speech that ends the turn                 |
| `VOICE_VAD_MAX_UTTERANCE_MS`     | 15000   | hard cap (utterance closed, `capped`)                   |
| `VOICE_VAD_NO_SPEECH_TIMEOUT_MS` | 6000    | no speech after opening → mic closed, nothing sent      |
| `VOICE_SESSION_IDLE_TIMEOUT_MS`  | 30000   | reserved for the (not implemented) session mode         |

Not an LLM: the VAD is RMS energy with a 250 ms calibration window, a slowly adaptive floor (only
on quiet frames), a 60 ms onset debounce and a 300 ms pre-roll.
