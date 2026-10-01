# Phase 5 — Performance and cost

## Azure `gpt-live-transcribe` — what was measured, what is pending

**Real Azure latency: NOT MEASURED** (deployment missing). Measurable today:

| Segment | Measured | Source |
| --- | --- | --- |
| tap → LISTENING (permission + server-side session mint + SDP negotiation + WebRTC connect) | 48–78 ms **with the mock transport** (no network) — real value pending Azure | voice-realtime-e2e-mock.json |
| start speech → first partial | pending Azure (mock scripted at ~1.8 s, not a measurement) | — |
| end speech → final transcript | 0.9 s VAD end-of-turn silence + provider time (pending Azure) | config |
| final transcript → Agno → preview/result | 2.0–2.9 s (real Agno, gpt-6.1-sol); prescription 5.1 s | mock E2E (real Assistant) |
| confirmation → backend result | 0.25 s | mock E2E (real backend) |
| Azure negotiation failure (deployment missing) | immediate ERROR, text fallback | azure-missing E2E |

**Cost model.** Azure prices `gpt-live-transcribe` by **audio duration** (see the Audio Models
section of the Azure OpenAI pricing page; OpenAI lists $0.017/minute for its own API — Azure's
price is not verified here). Billed duration ≈ the push-to-talk window: connection → commit/close.
Local VAD keeps it short: silence is never committed and the session closes at the no-speech
timeout (6 s) or 0.9 s after the end of speech; max 15 s per turn. **40 minutes on shift are not 40
minutes of STT**: only the seconds of each tapped command are streamed (e.g. 30 commands × ~5 s ≈
2.5 minutes). One Agno call per sent transcript; partials never trigger LLM calls.

---

## Previous iteration (server transport, Gemini opt-in)

Measured on 2026-09-30/10-01 with the local stack (Vite + backend + Postgres on this machine, AI
runtime on this machine with the production provider credentials, real Google Gemini STT, real Agno
skill router on Azure `gpt-6.1-sol`). Network to the providers: public internet from this
workstation. Not measured on a tablet or on Railway.

## Latency

Browser E2E (`evidence/voice-browser-e2e.json`, final run, 78/78):

| Segment                                                                              | Samples       | Measured                                                                                           |
| ------------------------------------------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------- |
| capture end (VAD end of turn) → transcript on screen                                 | 12 utterances | 1.20 – 1.85 s (median ≈ 1.3 s)                                                                     |
| end-of-turn detection itself                                                         | config        | 0.9 s of trailing silence (`VOICE_VAD_END_SILENCE_MS`)                                             |
| transcript «Invia» → Agno → first useful UI state (preview / result / clarification) | 7 turns       | 1.96 – 2.44 s; prescription draft 5.0 s (Agno + automatic therapy payload attach = 2 converse calls) |
| spoken «conferma» (text) → hint                                                      | 1             | 0.26 s (no LLM: recognised deterministically)                                                      |
| «Conferma» button → backend verified result                                          | 2             | 0.25 – 0.27 s                                                                                             |
| TTS start                                                                            | —             | not measured (optional TTS, off by default, device speechSynthesis)                                |

Provider check (`evidence/stt-provider-check-run1.json`, `-run2.json`; runtime → Gemini, 11 fixtures × 2 runs each):

| Run                     | Pass  | p50    | p90    | max    | Notes                                                                                   |
| ----------------------- | ----- | ------ | ------ | ------ | --------------------------------------------------------------------------------------- |
| run1                    | 22/22 | 1.15 s | 1.29 s | 1.5 s  | paced 4.5 s between calls                                                               |
| run2                    | 21/22 | 1.20 s | 8.99 s | 20.2 s | provider tail: one 9 s, one 18.6 s, one **timeout** at 20 s → typed `stt_timeout` (504) |
| unpaced burst (earlier) | —     | —      | —      | —      | Gemini answered **429** after ~15–20 calls/min → `rate_limited` (503)                   |

Typical total for a voice write: ~0.9 s end-of-turn + ~1.4 s STT + user review + ~2.0 s Agno →
preview; confirm → 0.3 s.

## Calls per voice turn

| Turn                                   | STT calls | LLM calls            | Notes                                                 |
| -------------------------------------- | --------- | -------------------- | ----------------------------------------------------- |
| silence / steady noise                 | 0         | 0                    | VAD discards locally (browser test J)                 |
| too-short sound                        | 0         | 0                    | VAD `too_short`                                       |
| noise burst (loud, speech-like energy) | 1         | 0                    | STT returns empty → nothing sent to the Assistant     |
| spoken command                         | 1         | 1 skill-route (Agno) | same as typed text afterwards                         |
| prescription draft                     | 1         | 1 skill-route        | + 1 non-LLM converse call to bind the therapy payload |
| spoken «conferma»                      | 1         | 0                    | deterministic, refused as confirmation                |
| «Conferma» button                      | 0         | 0                    | backend only                                          |

Voice adds exactly **one STT call per utterance** on top of the Phase 4 text path. No LLM is used
for VAD, for deterministic operations or for audio processing beyond STT.

## Cost drivers (measured tokens, no invented prices)

Gemini reports token usage per call (`metadata.usage`, from `usageMetadata`):

- `vitals-120-80.wav` (6.75 s file incl. 2.3 s padding): **296 input + 16 output tokens**.
- run2 total: **6,055 input + 277 output tokens for 22 calls / 141.8 s of audio** → ≈ 43 input
  tokens per second of audio (including the system instruction).
- In the browser the VAD trims leading silence (pre-roll 0.3 s) and ends 0.9 s after speech, so
  real utterances are shorter than the fixtures.

Cost per utterance = input_tokens × provider input price (audio) + output_tokens × output price, at
the price list of the configured model/tier on the provider's pricing page (not reproduced here:
not verifiable from this environment). Main drivers: utterance length (VAD end-silence and max
length), number of retries («Ripeti»), and the Agno call per sent transcript.

Optimisations in place: local VAD (no silence/noise sent), 16 kHz mono PCM (≈ 32 KB/s), one
utterance per tap, no streaming, transcript review before any LLM call, per-operator STT rate limit
(20/min), deterministic handling of «conferma», no TTS by default.

## Not measured

- Tablet hardware mic, Wi-Fi of the facility, Railway-hosted runtime latency.
- Azure transcription models (no deployment).
- Real (human) voices, accents, background ward noise.
