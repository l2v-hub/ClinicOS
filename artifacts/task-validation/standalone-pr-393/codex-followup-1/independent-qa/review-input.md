Actual review: https://github.com/l2v-hub/ClinicOS/pull/393#issuecomment-6250811630
Input file SHA256: ef7d16e075d9fd8731c5113db430de7a944a700fd6523a27eeb75bebc814fa78

## Claude review (read-only) — subject `d6bb325b1e767c9554e64da433c3f91b0217ee8a`

**Verdict: changes-requested** — 0 critical, 0 high, 2 medium, 5 low. Note: no controller packet, published as PR comment, read-only. I reviewed the code diff against merge-base `d1324cb3dd` with `origin/main`, excluding `artifacts/`: 25 files, +2727/−148. I read the packet `artifacts/task-validation/standalone-pr-393/` at this SHA. Its Final Decision is `IMPLEMENTED — NOT VERIFIED`. I did not run any tests.

### Findings

1. **medium — `backend/src/skills/http.ts:373`** (see also `backend/src/voice/stt.ts:344`)
   _Problem:_ `VOICE_STT_TRANSPORT=server` only changes what `/voice/status` reports to the UI. `POST /skills/voice/realtime-call` checks only that `provider.negotiateRealtimeCall` exists. `createRuntimeSttProvider()` always defines it, so the 409 `transport_unsupported` branch never runs for the real provider. If the runtime has `STT_REALTIME_ENABLED=true`, any operator with `voice.plan` can still open paid realtime sessions through a backend that an operator explicitly pinned to `server`. The backend kill switch is client-side only.
   _Requested change:_ in the route, refuse with 409 (and audit it) unless `voiceTransport(await runtimeSttStatus())` is `webrtc` and `realtime.available` is true. Alternatively, have `createRuntimeSttProvider` omit `negotiateRealtimeCall` when `VOICE_STT_TRANSPORT=server`.
   _Test expectation:_ a backend test with the runtime reporting realtime enabled+available and `VOICE_STT_TRANSPORT=server` expects 409, no runtime `/v1/voice/realtime-call` request, and an audit row.

2. **medium — `clinicos-ai-runtime/clinicos_ai/api/app.py:359`** (see also `clinicos-ai-runtime/clinicos_ai/voice/azure_realtime.py:88`)
   _Problem:_ nothing limits realtime cost on the server side. File STT records spend through `COSTS.add` (`clinicos_ai/voice/stt.py:217`), but the realtime path does not:
   - it records no `COSTS`, audio-seconds or session metric;
   - it does not check the budget or soft limit before `negotiate`;
   - it sets no `expires_after` on the client secret and no maximum session duration;
   - it does not cap concurrent sessions per operator.
     Media flows directly from browser to provider after the SDP exchange. Session length is bounded only by the client's VAD and `maxUtteranceMs`. A modified client can hold sessions open for the provider's maximum, up to 20 new sessions per minute per operator (`VOICE_STT_RATE_LIMIT_PER_MIN`). The runbook's "Cost check" row cannot see this spend. Voice is default OFF, so this is not a blocker today, but it must be fixed before anyone enables realtime.
     _Requested change:_
   - refuse `negotiate` when the AI budget is exhausted;
   - record at least one session counter or estimate per negotiation (e.g. `estimate_usd` with a duration ceiling);
   - request a short client-secret expiry;
   - enforce a maximum session duration, and document its value next to `STT_REALTIME_ENABLED` in the runbook;
   - add a small per-operator concurrency guard (one live session) on the backend.
     _Test expectation:_ runtime tests show (a) budget exceeded → 503 with no provider HTTP call, (b) a successful negotiation increments the cost or session metric, and (c) the client-secret request body contains the expiry. A backend test shows a second concurrent negotiation by the same operator is refused.

3. **low — `frontend/src/components/assistant/voice/useVoiceChannel.ts:457`**
   _Problem:_ `micActive` is `capture.active || micOpen(state)`. After `getUserMedia` resolves in webrtc mode, the stream is live and attached to the peer during negotiation, which can last up to 15 s. Audio can reach the provider once ICE connects. During that time the state is `REQUESTING_PERMISSION` and `capture.active` is false, so the app-level indicator says the mic is off. Cancel is visible and the browser's own indicator is on, so this is not hidden recording. It is still an inconsistent in-app indicator on a clinical surface.
   _Requested change:_ treat a pending stream (`pendingStream` in `useVoiceCapture`) as active. A simpler fix is to enable the tracks only after the transport reports ready.
   _Test expectation:_ a unit or browser check that `micActive` is true between grant and `listening` in webrtc mode, and false again after cancel.

4. **low — `backend/src/skills/http.ts:335`**
   _Problem:_ `voiceGate` refusals always audit `actionType: 'voice:transcribe'`, including denials and disabled-channel refusals on `/voice/realtime-call`. Successful and failed realtime negotiations audit `voice:session` (lines 397/424). Realtime denials are therefore misattributed in the audit trail.
   _Requested change:_ derive the action type from the route, e.g. pass it to the gate.
   _Test expectation:_ a `voice_disabled` response on realtime-call produces an audit row with `voice:session`.

5. **low — `.ai-architecture/phase-9-production/PROVIDER_CAPABILITY_MATRIX.json:82`** (see also `traits.realtime: True` for Azure in `clinicos_ai/models/provider_registry.py`)
   _Problem:_ this marks Azure realtime as a capability without any positive provider evidence. The packet itself says no real Azure call was made. The adapter's endpoint paths (`/openai/v1/realtime/client_secrets`, `/calls`) and the `type: transcription` session shape (`azure_realtime.py:51-56`) have only been checked against a synthetic peer. Project notes also record that the Azure realtime deployment was missing.
   _Requested change:_ keep the capability as "implemented, unverified" (or `false`) until an authorized synthetic-audio smoke passes. Alternatively, make the runbook row require that smoke explicitly before `STT_REALTIME_ENABLED=true`.
   _Test expectation:_ a documented smoke artefact (status codes and redacted shape only) before the flag is flipped in any environment.

6. **low — `backend/src/voice/stt.ts:307`**
   _Problem:_ the PR removed the 60 s status cache. Every `/skills/voice/status` call now makes a synchronous runtime round-trip with a 2 s timeout, and in the runtime it imports and validates the adapter. This adds latency to each Assistant open and load on the runtime. The rationale given ("no cross-environment cache") could be met with a cache keyed by base URL.
   _Requested change:_ restore a short TTL cache keyed by `AI_RUNTIME_URL`, or justify the removal.
   _Test expectation:_ two status calls within the TTL produce one runtime request.

7. **low — `e2e/qa-voice-pr-393.mjs:121`** (see also `e2e/qa-voice-pr-393-browser.mjs`)
   _Problem:_ these are about 900 lines of PR-specific QA harness. They depend on `docker`, `flock /tmp` and Linux, are not wired into CI, and live in the shared `e2e/` folder. Together with roughly 50k lines and multi-MB trace zips under `artifacts/`, they make a ~2.7k-line feature very heavy to merge and review.
   _Requested change:_ move the harness under the task packet (or drop it), and trim the duplicated trace/video copies across `voice-pr-393/` and `standalone-pr-393/`.
   _Test expectation:_ none (scope/hygiene).

### What holds up

- **Default OFF holds at both layers.** Realtime requires runtime `STT_REALTIME_ENABLED=true` plus an explicit `STT_REALTIME_MODEL`, and the backend requires `VOICE_CHANNEL_ENABLED=true` (`voiceGate`). With `STT_PROVIDER` set to anything other than Azure, config validation refuses realtime (`validation.py:67`). The current Google STT setup therefore cannot enable it implicitly, and no paid model is turned on by default.
- **Explicit confirmation is kept.** Partials are display-only and labelled "non viene inviato". A provider final is accepted only after a local commit (`useVoiceChannel.ts:260`). It must match the capture id and `TRANSCRIBING`, and then becomes `TRANSCRIPT_READY`, which still needs «Invia» and then the existing preview + «Conferma». Nothing writes vitals or therapy from speech directly.
- **Credentials stay server-side.** The API key and ephemeral grant never leave the runtime. Both runtime and backend allowlist the answer fields. Responses are size-bounded (96 kB / 64 kB SDP), redirects are refused, provider error bodies are never echoed, and logs carry only the outcome kind. I found no audio, transcript or SDP in logs or storage.
- **Mic lifecycle is solid.** It covers the permission gate, cancel during a pending permission, cancel or hidden tab or unmount during negotiation (`pendingStream` plus the `connecting` abort), resident change invalidation (`realtimeSeq`, captureId), one commit at most, a 15 s final timeout, and the early buffer error from QA1 now ending in a retryable state.
- `frontend/vercel.json` is untouched. The SPA rewrite still excludes `/assets/`. WebRTC media is not governed by `connect-src`, so no CSP change was needed.
- No migrations, no Prisma changes, and the server (file) transport path is unchanged when realtime is off.

### Limits

- Read-only static review. I executed no tests, builds or PR code, and did not inspect the binary evidence (trace, video, screenshots).
- No real Azure realtime call is evidenced anywhere. All browser and E2E evidence uses a synthetic peer and provider. Provider compatibility of `client_secrets`/`calls`, the session schema, and the Italian transcription quality remain unverified.
- I checked the reported counts (1386 frontend, 52 browser, 12 backend, 240 runtime) only against the packet text, not by re-running them. Several results are "inherited by input identity" from earlier SHAs.
- The PR has no prior formal reviews or inline threads, so there were no earlier findings to check against.
- Realtime is coupled to the file-STT provider: realtime needs `STT_PROVIDER=azure`. I did not assess whether that is the intended product direction, given that production currently uses Google STT.
