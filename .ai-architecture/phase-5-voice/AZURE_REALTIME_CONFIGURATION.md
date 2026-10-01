# Phase 5 — Azure OpenAI realtime STT configuration (`gpt-live-transcribe`)

Primary/default STT: **Azure OpenAI `gpt-live-transcribe`** through the Realtime API GA
(`/openai/v1`), on the **same Azure OpenAI resource** already used by the AI runtime
(`AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`). No new credential type was introduced: the runtime
already authenticates to this resource with the API key (`models/env_config.py`), so STT reuses it.

## Status of the resource (verified 2026-10-01, no secrets)

| Check                                                         | Result                                                                                                                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint host                                                 | `<resource>.services.ai.azure.com` (also reachable as `<resource>.openai.azure.com`)                                                                                    |
| `GET /openai/v1/models`                                       | 200 — catalog includes `gpt-live-transcribe-2026-07-28`, `gpt-realtime-whisper-2026-05-06`, `gpt-4o-transcribe-*`                                                       |
| `POST /openai/v1/chat/completions` (gpt-6.1-sol)              | 200 — v1 API works with the key                                                                                                                                         |
| Deployments                                                   | `gpt-5.4-nano`, `mistral-ocr-4-0`, `gpt-6-astra`, `gpt-6-sol`, `gpt-6-luna`, `FW-Kimi-K3`, `DeepSeek-V4-Flash`, `gpt-6.1-sol` — **no `gpt-live-transcribe` deployment** |
| `POST …/deployments/gpt-live-transcribe/audio/transcriptions` | 404 `DeploymentNotFound`                                                                                                                                                |
| `POST /openai/v1/realtime/client_secrets` (both hostnames)    | 404 `API Not Found` (no realtime deployment in the resource)                                                                                                            |
| Runtime health (`GET /v1/voice/health`)                       | `deployment_missing`                                                                                                                                                    |

**Blocker (external):** the deployment must be created by the resource owner (Foundry portal →
Models → Deploy a base model → `gpt-live-transcribe`, version 2026-07-29/2026-07-28 as listed,
Global Standard). Name it `gpt-live-transcribe` or set `AI_STT_DEPLOYMENT`.

## Environment

| Variable                                         | Where   | Default                         | Meaning                                                                                                                                 |
| ------------------------------------------------ | ------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `AI_STT_PROVIDER`                                | runtime | `azure_openai`                  | `azure_openai` · `google` (explicit opt-in) · `azure_batch` (opt-in) · `mock` (tests)                                                   |
| `AI_STT_MODEL`                                   | runtime | `gpt-live-transcribe`           | model id (legacy `provider:model` = explicit opt-in)                                                                                    |
| `AI_STT_DEPLOYMENT`                              | runtime | = `AI_STT_MODEL`                | Azure deployment name (may differ from the model id)                                                                                    |
| `AI_STT_LANGUAGE`                                | runtime | `it`                            | → `transcription.languages: ["it"]`                                                                                                     |
| `AI_STT_PROMPT`                                  | runtime | short RSA dictation description | → `transcription.prompt` (no clinical records)                                                                                          |
| `AI_STT_KEYWORDS`                                | runtime | —                               | newline/`;` separated hint terms (drugs, sigle, reparti) → `transcription.keywords` (sanitized: no `<>`/CR/LF, ≤ 64 chars, ≤ 100 terms) |
| `AI_STT_DELAY`                                   | runtime | — (service default)             | `minimal`·`low`·`medium`·`high`·`xhigh` → `transcription.delay` (latency/accuracy)                                                      |
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY` | runtime | existing                        | same resource as the rest of the AI stack                                                                                               |
| `AZURE_OPENAI_REALTIME_ENDPOINT`                 | runtime | —                               | optional override of the endpoint for realtime only (same resource, other hostname)                                                     |
| `VOICE_CHANNEL_ENABLED`                          | backend | off                             | per-environment switch (privacy decision)                                                                                               |
| `VOICE_STT_TRANSPORT`                            | backend | `webrtc` when offered           | `server` forces the utterance transport                                                                                                 |

Nothing hardcodes hostnames, regions or secrets: every URL is derived from the configured endpoint.

## Session (fixed server-side)

```json
{
  "type": "transcription",
  "audio": {
    "input": {
      "format": { "type": "audio/pcm", "rate": 24000 },
      "transcription": {
        "model": "<AI_STT_DEPLOYMENT>",
        "languages": ["it"],
        "prompt": "Dettatura di un operatore sanitario in una RSA italiana: …",
        "keywords": ["…optional…"],
        "delay": "…optional…"
      },
      "turn_detection": null
    }
  }
}
```

Fields are the documented ones for `gpt-live-transcribe` (`languages`, never `language`; `prompt`,
`keywords`, `delay`). `turn_detection: null` because the model supports no server/semantic VAD:
ClinicOS commits each turn with its local VAD (`input_audio_buffer.commit`).

## Transports

| Transport            | Path                                                                                                                                                                                                                    | Auth                                                                                  | Use                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **webrtc** (default) | browser SDP offer → backend `POST /skills/voice/realtime-call` → runtime `POST /v1/voice/realtime-call` → Azure `POST {endpoint}/openai/v1/realtime/client_secrets` (api-key) then `POST {endpoint}/openai/v1/realtime/calls` (Bearer ephemeral) → SDP answer back to the browser; media browser ↔ Azure | API key AND ephemeral token server-side only; the browser receives the SDP answer | push-to-talk with live partials |
| **server**           | backend `POST /skills/voice/transcribe` (WAV) → runtime → `wss://{host}/openai/v1/realtime?model={deployment}` (`api-key` header) → append 100 ms PCM16 24 kHz chunks → commit → deltas + completed                     | API key server-side only                                                              | one-utterance path / future devices / fallback on the SAME deployment |

Choice: WebRTC is Azure's recommended browser transport (~100 ms vs ~200 ms WebSocket) and avoids a
media relay through ClinicOS. The SDP negotiation is proxied by ClinicOS (Azure's documented «more
secure» option): the runtime mints the ephemeral client secret and uses it at once for
`/realtime/calls`, so **neither the key nor the token reaches the browser**, and the browser never
calls an Azure HTTP endpoint — the frontend CSP (`connect-src`) needs no Azure host (independent QA
H1). Negotiation happens only after identity + `voice.plan` + `VOICE_CHANNEL_ENABLED` + rate limit and
is audited (`voice:session`). Residual: once connected, the browser's data channel could send its own
`session.update` (e.g. another prompt) to the same session — no token is exposed and the session
stays one transcription session of this resource; see PROMPT6_HANDOFF §J.

## Health check (non-destructive)

`GET /skills/voice/health` (roles with `voice.stt_status`) → runtime `GET /v1/voice/health`: lists
the resource deployments (`/openai/deployments?api-version=2022-12-01`) and reports `ok`,
`not_configured`, `auth_failed`, `deployment_missing` with a clear message. No session is created.
`scripts/voice/azure-stt-check.mjs` adds the Azure-dependent checks (mint + WebSocket transcription
of the fixtures) and exits BLOCKED / PASS / FAIL.

## Failure behaviour

Deployment missing / auth / network / 429 → typed error (`stt_unavailable`, `stt_timeout`,
`stt_provider_error`) → voice ERROR with a clear message → «Scrivi il messaggio» → the text
Assistant keeps working. **No silent fallback** to Gemini or any other provider (verified by
`azure-missing` E2E: 0 utterance uploads, 0 other STT calls).
