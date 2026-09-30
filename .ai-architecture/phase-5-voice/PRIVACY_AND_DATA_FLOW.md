# Phase 5 — Privacy and data flow

Only what is implemented and verified is stated here. Provider-side retention is governed by the
provider's terms and is **not** guaranteed by ClinicOS.

## Where audio and transcript live

| Step                                          | Audio                                                                   | Transcript                     | Retention                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Browser, mic open (LISTENING / SPEECH_ACTIVE) | Float32 frames in JS memory (VAD pre-roll ≤ 300 ms + current utterance) | —                              | Until the utterance ends / is discarded / cancelled; the mic tracks are stopped immediately after        |
| Browser, silence / steady noise / too short   | discarded in memory                                                     | —                              | never sent anywhere                                                                                      |
| Browser → backend                             | one WAV (16 kHz mono PCM16, ≤ 2 MiB) in the HTTPS request body          | —                              | —                                                                                                        |
| Backend `/skills/voice/transcribe`            | `Buffer` in memory for the request                                      | response body                  | none: not written to DB, disk or logs                                                                    |
| Backend → runtime                             | base64 JSON over the service connection (bearer token)                  | —                              | —                                                                                                        |
| Runtime `/v1/voice/transcribe`                | bytes in memory for the request                                         | returned                       | none: logs carry provider, model, bytes, duration, outcome only                                          |
| Runtime → STT provider                        | inline audio (Gemini `generateContent`) or multipart (Azure) over HTTPS | returned                       | **provider terms** (Google Gemini API / Azure OpenAI). Not controlled by ClinicOS                        |
| Browser, TRANSCRIPT_READY                     | —                                                                       | React state (editable)         | discarded on send / cancel / resident change / close                                                     |
| `/skills/converse` (after «Invia»)            | —                                                                       | the message, as for typed text | the existing Phase 4 path (workflow store in memory; Agno receives the message; audit stores names only) |

Audit (`AiAuditEvent`, channel `voce`, actionType `voice:transcribe`): operator, role, outcome
(ok / empty / error / denied), provider name, duration bucket (`audio:lt1s|1-5s|5-15s|gt15s`), STT
round-trip ms, error code. **Never** audio, transcript text, resident or values (asserted in the
backend test). The skill request audit adds the field name `input:voice`.

## Controls verified

- **Mic permission**: requested only on an explicit tap; denied / missing / busy mic → ERROR with a
  text-fallback hint, nothing sent (browser test I).
- **No ambient streaming**: no continuous capture; one utterance per tap; the VAD sends nothing for
  silence or steady noise (browser test J: 0 transcribe requests).
- **No secrets in the client**: the browser only calls the backend with the operator session;
  provider keys live in the runtime env; the backend↔runtime token stays server-side.
- **Authenticated endpoints**: `/skills/voice/*` behind `requireOperator` +
  `requireAuthorizationContext`; runtime voice endpoints behind the service token (tests: 401).
- **Identity/session binding**: the transcript is returned only to the caller; the Assistant request
  carries the same session; the workflow is bound to the operator.
- **Transcript authorization**: capability `voice.plan` (Phase 2 policy; administrator DENIED) +
  per-environment `VOICE_CHANNEL_ENABLED` (default off).
- **Payload limits / validation**: content-type whitelist, ≥ 1000 bytes, RIFF/WAVE check for WAV,
  2 MiB cap (413), 20 utterances/min per operator (429, `VOICE_STT_RATE_LIMIT_PER_MIN`), provider
  call only after all checks (backend test: 0 provider calls for invalid/unauthorised audio).
- **No cross-session leakage**: no server-side audio/transcript store; the client drops late STT
  answers of a cancelled capture (`captureId`); a resident change discards a pending transcript.
- **Spoken output**: off by default; fixed status phrases only, never clinical data (unit test).

## Provider data flow — decision required before enabling in an environment

Enabling voice in an environment sends operators' utterances (which may contain resident names and
clinical values) to the configured STT provider:

- `google:gemini-3.5-flash-lite` (verified working) — Google Gemini API (`generativelanguage.googleapis.com`)
  with the runtime's `GOOGLE_API_KEY`. Data use/retention depends on the Google account tier and
  terms (paid vs free tier differ). **Not verified here.**
- `azure:<deployment>` — Azure OpenAI in the ClinicOS resource; requires a transcription deployment
  (whisper / gpt-4o-transcribe) that does **not** exist today (the chat deployment `gpt-6.1-sol`
  rejects audio input).

Therefore voice is shipped **disabled** (`VOICE_CHANNEL_ENABLED` unset) in demo and production. Who
decides: the owner (privacy / DPA with the provider). How to enable: see PROMPT6_HANDOFF.md.

## Gaps

- No provider-side zero-retention guarantee (depends on contract).
- Browser memory is not zeroed explicitly (GC-managed).
- Rate limit is in-memory per backend instance (like the existing AI limiters).
