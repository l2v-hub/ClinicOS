# Phase 5 — STT provider contract

The Assistant, skills, Agno and the UI depend on this contract, never on a provider.

## Backend (TypeScript) — `backend/src/voice/stt.ts`

```ts
interface SpeechToTextProvider {
  /** server transport: one finished utterance → FINAL transcript */
  transcribe(audio: Utterance, locale: string, context?: { requestId?: string }): Promise<TranscriptResult>;
  /** realtime transport (optional per provider): SDP offer → SDP answer for browser WebRTC */
  negotiateRealtimeCall?(offerSdp: string, context?: { requestId?: string }): Promise<RealtimeCallAnswer>;
}
interface RealtimeCallAnswer {
  sdp: string;              // the ONLY thing the browser receives (no key, no token)
  model: string; deployment: string;
  expiresAt: number | null; // of the server-side ephemeral session token
  transport: 'webrtc'; mock?: boolean;
}
interface TranscriptResult {
  text: string; locale: string; confidence: number | null; timestamps: …[];
  empty: boolean;
  metadata: { provider; model; durationMs; roundTripMs; usage?: {…} };
  error?: { code: string; message: string };
}
```

Implementations: `createRuntimeSttProvider()` (default; the AI runtime owns credentials) and
`setSttProvider()` for tests. Errors: `SttUnavailableError(code, message, status)` with codes
`stt_unavailable` (503), `stt_timeout` (504), `stt_provider_error` (502), `stt_invalid_audio` (400).

## Runtime (Python) — `clinicos_ai/voice/`

| Provider (`AI_STT_PROVIDER`) | Implementation                                                                                            | Default                                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `azure_openai`               | `azure_realtime.py`: `realtime_config`, `session_config`, `mint_client_secret`, `transcribe_ws`, `health` | **yes** (`AzureOpenAILiveTranscribeProvider` equivalent) |
| `google`                     | `stt._google` (Gemini generateContent)                                                                    | opt-in only                                              |
| `azure_batch`                | `stt._azure` (`/audio/transcriptions` deployments)                                                        | opt-in only                                              |
| `mock`                       | empty transcripts + fake realtime sessions                                                                | tests only                                               |

Selection rules (`stt.stt_model()`):

1. `AI_STT_PROVIDER` set → that provider (unknown → not available).
2. Legacy `AI_STT_MODEL=provider:model` without `AI_STT_PROVIDER` → that provider (explicit).
3. Otherwise `azure_openai` with `gpt-live-transcribe`, available only if the Azure resource is
   configured. **Never** falls back to another provider: no Azure → STT not available.

## Partial vs final

|                              | Partial (`…input_audio_transcription.delta`)                                          | Final (`…input_audio_transcription.completed`)         |
| ---------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Arrives                      | while speaking / right after commit (webrtc)                                          | after `input_audio_buffer.commit`                      |
| UI state                     | `TRANSCRIPT_PARTIAL` / `TRANSCRIBING`, italic «Testo provvisorio (non viene inviato)» | `TRANSCRIPT_FINAL`, editable box                       |
| Can be sent to the Assistant | **never** (reducer rejects `submit`; no send button rendered)                         | only by the user's «Invia»                             |
| Side effects                 | none                                                                                  | none until the Assistant workflow + human confirmation |
| Server transport             | counted only (`usage.partials`, `firstPartialMs`)                                     | returned as `text`                                     |

## What the STT never does

Authorization, resident selection, clinical decisions, skill planning, tool execution, business
rules, number/dose conversion. Those stay in `Assistant → Agno → Skill → Policy → Tool → Backend`.
The prompt/keywords only bias recognition; the transcript is literal and reviewed by the user.
