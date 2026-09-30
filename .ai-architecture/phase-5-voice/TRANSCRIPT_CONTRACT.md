# Phase 5 — Transcript contract

## STT abstraction

```ts
// backend/src/voice/stt.ts
interface SpeechToTextProvider {
  transcribe(
    audio: Utterance,
    locale: string,
    context?: { requestId?: string },
  ): Promise<TranscriptResult>;
}
interface Utterance {
  bytes: Buffer;
  mimeType: string;
  durationMs?: number;
  source?: string;
}
interface TranscriptResult {
  text: string; // verbatim, trimmed, ≤ 2000 chars
  locale: string; // 'it-IT' baseline
  confidence: number | null; // provider confidence when available (Gemini: none)
  timestamps: { startMs: number; endMs: number; text: string }[]; // empty today
  empty: boolean; // no intelligible speech → nothing is sent to the Assistant
  metadata: {
    provider;
    model;
    durationMs;
    roundTripMs;
    usage?: { inputTokens; outputTokens; totalTokens };
  };
  error?: { code: string; message: string };
}
class SttUnavailableError {
  code: 'stt_unavailable' | 'stt_timeout' | 'stt_provider_error' | 'stt_invalid_audio';
  status;
}
```

Implementations: `createRuntimeSttProvider()` (default, AI runtime) and any object injected with
`setSttProvider()` (tests). The runtime adapter (`clinicos_ai/voice/stt.py`) selects the provider from
`AI_STT_MODEL = provider:model`: `google:<gemini model>`, `azure:<deployment>` (Azure OpenAI
`/audio/transcriptions`), `mock:*` (empty transcript, CI).

## HTTP

`POST /skills/voice/transcribe` — body = the audio (`audio/wav|x-wav` only: the only validated container), headers
`X-Utterance-Ms` (optional), `X-Audio-Source` (optional). Responses: `200 TranscriptResult`,
`400 invalid_audio`, `401`, `403 voice_denied`, `413` (> 2 MiB), `429` (STT rate limit),
`502 stt_provider_error`, `503 stt_unavailable | voice_disabled`, `504 stt_timeout`.

`GET /skills/voice/status` → `{ voiceAllowed, channelEnabled, sttConfigured, locale, maxUtteranceBytes, vad }`.

Runtime: `POST /v1/voice/transcribe {audio_base64, mime_type, locale}` and
`GET /v1/voice/stt-status`, both with the service bearer token.

## Transcript ≠ action

- The transcript is returned to the browser and shown in an editable box. Nothing is sent to the
  Assistant until the user presses «Invia» (test A: zero `/skills/converse` before «Invia»).
- «Invia» sends the (possibly corrected) text through `submitText(text, 'voice')` — the Phase 4 path.
  Interpretation (Agno / deterministic), skills, policy, resident scope, preview and confirmation are
  unchanged.
- An empty transcript (`[NESSUN_PARLATO]` from the provider, or empty text) returns to IDLE with
  «Non ho capito le parole: nessun comando inviato».

## No silent semantic correction

- STT system instruction: literal transcription; names, drugs, numbers, doses and units exactly as
  spoken; only orthography normalised (digits for spoken numbers, capitalised surnames).
- Backend and frontend only `trim()` (and cap at 2000 chars). No spell-checking, no drug-name
  matching, no rewriting.
- Deterministic interpreter addition (literal reading, documented): «120 su 80» is read as the
  blood pressure 120/80 **only when «pressione» / «PA» is in the phrase** — «saturazione 95 su 100»
  stays SpO₂ 95, «Barthel 90 su 100» is not a pressure (QA M2), and a rejected pair never hides a
  later explicit pressure.
- Residual risk (deterministic fallback only, i.e. when Agno is unavailable): a lowercase surname
  from STT («… per esposito.») is not recognised as a resident reference, so a context resident, if
  open, may be the proposed target. A trailing-lowercase-word heuristic was tried and **removed**
  after QA (it turned «per febbre / per terra» into residents). Mitigations: the Agno router
  (primary) handles it (browser test H), the user reviews the transcript, the preview shows the
  target resident and nothing is written without «Conferma».
- The user sees the transcript before sending and the structured preview (resident, values) before
  confirming.

## Observed STT behaviour (real provider, synthetic it-IT voice)

- Numbers come as digits («120 su 80», «1000 mg», «alle 8:00»).
- Surname casing varies («Ferri» / «ferri», «esposito» mostly lowercase) despite the instruction.
- Occasional mishearing of names with the synthetic voice («per Ferri» → «perfetti» once): the
  Assistant asked «Per quale ospite?» (zero writes); re-recording fixed it.
- With the instruction in the same user turn as the audio, «Prescrivi» was once heard as
  «Trascrivi» (prompt echo); moving the rules to a system instruction removed it in later runs.
- Silence, steady noise and a loud noise burst → empty transcript in every run (no invented command).
