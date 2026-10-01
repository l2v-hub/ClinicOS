# Phase 5 — E2E test report

## Azure `gpt-live-transcribe` iteration (2026-10-01)

| Layer | Where | Result |
| --- | --- | --- |
| Unit — runtime Azure adapter (config, session shape, provider selection/no fallback, mint, server-side SDP negotiation, diagnostics, health + data-plane probe, WAV→24 kHz + malformed WAV, **real local WebSocket server** speaking the Realtime protocol, failures/timeout, endpoints) | `clinicos-ai-runtime/tests/test_voice_azure_realtime.py` | 13/13 (runtime total OK) |
| Unit — frontend (state machine partial/final, realtime event parser, WebRTC transport with fake peer: negotiation through ClinicOS, refusal, cancel during negotiation, dropped link, disconnect grace; VAD, WAV) | `voice/__tests__/voice.test.ts` | 27/27 |
| Integration — backend (realtime-call gate/SDP-only answer/audit/errors, runtime client mapping by cause, health roles + rate limit, status transport) | `backend/src/voice/__tests__/voice-e2e.test.ts` | 13/13 (skills+voice 47/47) |
| **Azure-dependent** (health, mint, WebSocket transcription of fixtures) | `scripts/voice/azure-stt-check.mjs` → `evidence/azure-stt-check.json` | **BLOCKED** — `deployment_missing` |
| Browser — **real Azure failure path** (deployment missing → diagnostic, no fallback, text works) | `voice-realtime-e2e.mjs --mode azure-missing` | 5/5 |
| Browser — **MOCK realtime transport** (fake RTCPeerConnection; real mic VAD, SDP negotiation through backend+runtime mock, Agno, policy, DB, audit) | `voice-realtime-e2e.mjs --mode mock` | 34/34 |
| Browser — real Azure end-to-end | `voice-realtime-e2e.mjs --mode azure` | **BLOCKED** (not run) |
| Regression — text Assistant (Phase 4 E2E, fresh DB) | `assistant-browser-e2e.mjs` | 46/46 |
| Regression — frontend / backend skills+voice / backend full serial (fresh DB) / build | `npm test`, suites | 1003+ tests, 9 baseline fails (0 new) / 47/47 / 1599 tests, 21 fails in 14 baseline files (0 new) / build OK |

Prompt §18 mapping: A Azure connectivity **BLOCKED** (health = deployment_missing; endpoint + key
valid: v1 models/chat 200) · B audio→gpt-live-transcribe→final **BLOCKED** (mock: PASS) · C partial
no action PASS (mock) · D Doctor read PASS (mock transport, real Agno) · E write/preview/confirm/audit
PASS (mock) · F numbers PASS (mock) · G ambiguous PASS · H prescription/administration PASS ·
I revocation PASS · J Azure failure → text fallback **PASS on real Azure** · K silence/noise PASS
(no commit for silence/steady noise) · L duplicate confirmation PASS · M Assistant regression PASS ·
N GUI regression PASS.

Independent QA round 1 (FAILED VALIDATION) → fixed: H1 CSP blocked the browser→Azure SDP call →
negotiation proxied server-side (token never in the browser); H2 mic kept running after a realtime
error and could upload via the server path → `stopAll()` on realtime errors + transport bound per
capture; M1 cancel during negotiation → pending stream released + negotiation aborted (raced);
M2 dropped link detected (`realtime_disconnected`); L1 errors by cause; L2 health rate-limited +
data-plane probe + config errors reported; L3 WAV off the event loop + malformed WAV = 400;
L4 commit delayed 250 ms (cancellable) + narrower empty-buffer match; L6 docs.
Independent QA round 2 (code READY FOR QA) residuals → fixed: R1 webrtc captures never take the
upload path (`captureMode` guard); R2 the 250 ms commit delay implemented; R3 `azure-stt-check.mjs`
now negotiates a real Chromium WebRTC offer through `/v1/voice/realtime-call`; R4 the deployment
probe only trusts an explicit operation-level refusal; R5 `invalid_sdp` message, `disconnected`
tolerated for 3 s (`failed` immediate), timeouts runtime 6+10 s < backend 18 s < browser 20 s.

---

## Previous iteration (server transport, Gemini opt-in)

Date: 2026-09-30 → 2026-10-01. Branch `feat/phase5-voice` (from origin/main 71af6723).
All clinical data synthetic (DEMO-P4 / DEMO-P5 residents). Local disposable Postgres only.

## Test layers

| Layer                                                                                          | What                                                                                                                                                                                                                                                                                                                                                                                                          | Where                                                                                          | Result                                                                                                                     |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Unit (frontend)                                                                                | audio state machine, VAD (silence, steady noise, click, pauses, cap, flush, end-silence config), WAV encoder/resampler, TTS phrases                                                                                                                                                                                                                                                                           | `frontend/src/components/assistant/voice/__tests__/voice.test.ts`                              | **20/20**                                                                                                                  |
| Unit (frontend)                                                                                | same-preview «conferma» shows the server hint; voice source kept                                                                                                                                                                                                                                                                                                                                              | `assistant/__tests__/assistantState.test.ts` (+1)                                              | pass                                                                                                                       |
| Unit (runtime)                                                                                 | adapter: not configured, invalid audio, mock empty, Gemini request shape (system instruction, audio-only user turn, key in header), `[NESSUN_PARLATO]`, typed errors, usage tokens, endpoint auth/limits, stt-status auth                                                                                                                                                                                     | `clinicos-ai-runtime/tests/test_voice_stt.py`                                                  | **6/6** (runtime total 182/182)                                                                                            |
| Integration (backend, real app over HTTP, real Postgres, fake STT via `setSttProvider`)        | runtime STT client vs a fake runtime (bearer, base64, error mapping, usage whitelist); VAD env; «120 su 80» only with pressione/PA; no lowercase-word residents; webm refused; status per role; 401/403/400/413/503 before any provider call; `VOICE_CHANNEL_ENABLED`; verbatim transcript + PHI-free audit; provider down/crash/empty; transcript→preview→spoken «conferma» refused→double confirm = 1 write; `inputChannel` validation; STT rate limit 429 | `backend/src/voice/__tests__/voice-e2e.test.ts`                                                | **10/10**                                                                                                                  |
| Provider-dependent (real Gemini through the runtime)                                           | 11 fixtures (8 Italian phrases by the Windows it-IT voice + silence, steady noise, noise burst) × 2 runs                                                                                                                                                                                                                                                                                                      | `scripts/voice/stt-provider-check.mjs` → `evidence/stt-provider-check-run1.json`, `-run2.json` | run1 **22/22**; run2 **21/22** (1 provider timeout at 20 s → typed `stt_timeout`)                                          |
| Browser E2E (Chromium, fake mic fed with WAV fixtures, real STT + real Agno + real backend/DB) | Prompt 5 §16 A–M + resident change + phone layout                                                                                                                                                                                                                                                                                                                                                             | `scripts/voice/voice-browser-e2e.mjs` → `evidence/voice-browser-e2e.json`, `evidence/screens/` | **78/78**                                                                                                                  |
| Regression — text Assistant (Phase 4 browser E2E, Agno live)                                   | 46 checks                                                                                                                                                                                                                                                                                                                                                                                                     | `scripts/assistant/assistant-browser-e2e.mjs` → `evidence/regression-assistant-text-e2e.json`  | **46/46**                                                                                                                  |
| Regression — backend full suite, serial, fresh DB                                              | 1596 tests                                                                                                                                                                                                                                                                                                                                                                                                    | run-serial (`--test-concurrency=1`)                                                            | 1574 pass, 21 fail in 14 files — **all 14 files in the pre-existing Phase 4 baseline, 0 new**                              |
| Regression — frontend                                                                          | 998 tests                                                                                                                                                                                                                                                                                                                                                                                                     | `npm test`                                                                                     | 989 pass, 9 fail (8 tests + 1 file in operator components) — **all pre-existing (same ✖ in the recorded baseline), 0 new** |
| Build / typecheck / lint                                                                       | frontend `tsc -b && vite build`; backend `tsc --noEmit`; eslint on changed dirs                                                                                                                                                                                                                                                                                                                               | —                                                                                              | pass (repo-wide frontend lint has pre-existing errors in untouched legacy files)                                           |

## Browser E2E A–M (real STT + Agno)

| #   | Scenario                                                                                                                                                                                                                                                                                                                                         | Evidence (screens)                                | Result     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ---------- |
| A   | Doctor 1 push-to-talk read: mic IDLE → LISTENING → SPEECH_ACTIVE → TRANSCRIBING → TRANSCRIPT_READY; transcript «Dimmi tutto su questo ospite.»; nothing sent before «Invia»; `patient.overview` COMPLETED via **Agno**; `inputChannel=voice`; audit `voice:transcribe` (channel voce) + request audit `input:voice`; chat marks «Dettato a voce» | A-transcript-review, A-read-result                | PASS       |
| B   | Nurse voice write: «pressione 120 su 80» → preview 120/80 for the context resident → zero write → spoken «conferma» transcribed and **refused** (hint, still zero write) → UI «Conferma» → COMPLETED → 1 reading with `pa: 120/80` → audit execute                                                                                               | B-preview, B-spoken-conferma-refused, B-completed | PASS       |
| C   | «… per Ferri» (two nurse residents Ferri) → NEEDS_CLARIFICATION with both, no preview, zero write                                                                                                                                                                                                                                                | C-ambiguous                                       | PASS       |
| D   | Doctor: spoken prescription (paracetamolo 1000 mg, 8 e 20) → HIGH_RISK preview only, zero therapy, cancel → CANCELLED. Nurse: spoken administration → HIGH_RISK preview only, zero administrations                                                                                                                                               | D-prescription-preview, D-administration-prepared | PASS       |
| E   | Heard «140 su 90», transcript corrected to «135 su 85» → preview 135/85, zero write                                                                                                                                                                                                                                                              | E-corrected-preview                               | PASS       |
| F   | «Annulla» on the transcript → CANCELLED, 0 Assistant requests; «Annulla» while listening → mic released, 0 audio sent; zero write                                                                                                                                                                                                                | F-cancelled                                       | PASS       |
| G   | Preview ready → admin revokes `parameters.create_reading` → «Conferma» → DENIED, zero write, voice state ERROR (no false success); policy restored                                                                                                                                                                                               | G-revoked                                         | PASS       |
| H   | «… per esposito» (doctor's resident, out of nurse scope; lowercase from STT) → no preview, zero write on Esposito and on the context resident                                                                                                                                                                                                    | H-out-of-scope                                    | PASS       |
| I   | STT 503 → ERROR «non disponibile» → «Scrivi il messaggio» → typed request COMPLETED; mic permission denied → ERROR + text hint, 0 audio sent                                                                                                                                                                                                     | I-stt-error, I-mic-denied                         | PASS       |
| J   | silence and steady noise → VAD sends **0** requests; noise burst → 1 STT call → empty → «nessun comando inviato»; zero write                                                                                                                                                                                                                     | J-silence, J-steady-noise, J-noise-burst          | PASS       |
| K   | double «Invia» → 1 Assistant request; double «Conferma» → exactly 1 write                                                                                                                                                                                                                                                                        | (B)                                               | PASS       |
| L   | Phase 4 text Assistant E2E                                                                                                                                                                                                                                                                                                                       | regression-assistant-text-e2e.json                | 46/46 PASS |
| M   | classic GUI: all 8 operator sections render without console errors; Pazienti lists residents; back from the Assistant                                                                                                                                                                                                                            | M-classic-pazienti                                | PASS       |
| —   | resident change while a transcript is pending → discarded; phone 390 px without horizontal scroll                                                                                                                                                                                                                                                | phone-voice                                       | PASS       |

Second utterance in the same page (B spoken «conferma») is fed by a MediaStream built from the
fixture (Chromium restarts its fake-mic file at every getUserMedia); every other capture uses the
Chromium fake audio device. Everything after the stream (VAD, WAV, STT, Assistant) is identical.

Environment of the browser run: backend `SKILLS_INTERPRETER=agno`, `VOICE_CHANNEL_ENABLED=true`,
`AI_RATE_LIMIT_PER_MIN=600` (the E2E opens many sessions of the same operator per minute; default
60 would 429 the 8th session — a test-only setting), runtime local with `AI_STT_MODEL=google:gemini-3.5-flash-lite`
and the production provider credentials injected by `railway run` (never printed).

## Issues found and fixed during the loop

1. Runtime venv lacked `agno` → skill-route 502 → deterministic fallback (A «interpreted by Agno»
   failed) → installed runtime requirements; rerun green.
2. `/skills` rate limit hit by consecutive E2E sessions → test-only raise, documented.
3. `.ds-btn` restyled in voice CSS → design-system guard test failed → rule removed.
4. STT prompt in the user turn leaked «Trascrivi» into a transcript → system instruction.
5. Lowercase surname from STT ignored by the deterministic interpreter → a trailing-lowercase
   heuristic was added, then **removed** after independent QA (M3: ordinary words became residents);
   documented as residual risk of the fallback path.
6. Administration fixture consumed by the Phase 4 E2E → Phase 5 seed has its own due therapy.
7. Chat hid the server reply to a spoken/typed «conferma» → same-preview replies shown.
8. Gemini 429 on bursts / tail latency → typed errors, pacing in the provider check, per-operator
   STT rate limit, documented.

### Independent QA round 1 (FAILED VALIDATION) → fixed

| Finding | Fix | Verified by |
| --- | --- | --- |
| H1 mic kept recording / uploading after resident change or cancel during a pending permission prompt | start gate in `useVoiceCapture` (late streams stopped), `listening` ref + `stopAll()` in `useVoiceChannel` on cancel / resident change / new start / text | browser «H1 resident change while listening» (0 uploads, tracks ended), «H1 cancel during the permission prompt» (delayed getUserMedia) |
| M2 «95 su 100» read as pressure | `bloodPressureMatch`: «su» only with «pressione»/«PA» | backend unit assertions (saturazione, Barthel, mixed phrase) |
| M3 ordinary words after «per» became residents | heuristic removed | backend unit «QA M3» |
| M4 speech right after the tap lost | percentile calibration, fast downward floor (also during speech), early audio kept and trimmed at onset | frontend unit (2 tests, one proven to fail without the fix) + browser «M4 no leading silence» |
| L5 body buffered before authz; unvalidated containers | `voiceGate` before `express.raw`; WAV only | backend (403/503 before body; webm → 400) |
| L6 runtime unbounded JSON / non-JSON provider reply | Content-Length check (413); typed provider_error; 502 on unexpected | runtime unit |
| L7 413 message | any 413 → «Frase troppo lunga»; client clamps max length to the byte limit | code review |
| L8 local restyle of `.ds-btn` elements | voice CSS layout-only; pulse on the non-control dot | design-system guard + review |
| L9 test hygiene | env restored in runtime tests | runtime unit |

## Tablet acceptance checklist (MANUAL — not executed here)

Run on the target tablet(s) (iPad Safari, Android Chrome) over HTTPS, with voice enabled in the
test environment. Mark each ✅/❌ with device, OS, browser.

1. **Permission**: first tap «Parla» → OS/browser prompt; deny → error + «Scrivi il messaggio»; allow → LISTENING.
2. **Start/stop**: tap «Parla» → pulsing blue mic + «Fine»; tap «Fine» mid-sentence → transcript of what was said.
3. **Mic state**: the state label and pulsing button are visible at arm's length; mic indicator of the OS turns off after each utterance.
4. **Speech**: «Registra pressione 120 su 80 per questo ospite» → transcript correct → preview 120/80.
5. **Pauses**: short pause mid-sentence (< 0.9 s) does not cut; long pause ends the turn.
6. **Moderate noise**: ward/corridor noise, TV, other voices at 2–3 m → no invented command; if a wrong transcript appears it is visible before «Invia».
7. **Transcript correction**: edit a value in the transcript box → preview uses the edited value.
8. **Resident change**: change resident while the transcript is shown → «Ospite cambiato: la trascrizione è stata scartata».
9. **Preview**: resident, values, class and «nulla è stato ancora scritto» visible.
10. **Confirm**: saying «conferma» does nothing; only the «Conferma» button writes; record appears in the classic chart.
11. **Cancel**: «Annulla» on mic / transcript / preview → nothing written.
12. **Text fallback**: «Scrivi a mano» moves the transcript into the text box; typing works while the mic is off.
13. **Orientation**: rotate during LISTENING and during review → layout usable, no horizontal scroll; capture either continues or ends cleanly.
14. **Timeout**: open the mic and stay silent 6 s → «Nessun parlato rilevato: non è stato inviato nulla»; lock the screen / switch app during LISTENING → «Ascolto interrotto».
15. **TTS (optional)**: «Voce on» speaks only status phrases (never names/values); «Voce off» stops immediately.
16. **Bluetooth / clip-on mic** (if available): same as 4–6.

## Not executed (clearly separated)

- Hardware/device tests above (no tablet in this environment).
- Hosted (Railway) voice: voice is not enabled in demo/production (privacy decision pending).
- Azure transcription models (no deployment exists).
- Real human voices / accents (fixtures are synthetic TTS).
