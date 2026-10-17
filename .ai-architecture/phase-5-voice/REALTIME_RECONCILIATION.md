# Realtime voice reconciliation after PR #393

The current provider-neutral contract remains authoritative: `STT_PROVIDER` + `STT_MODEL`
select file transcription, with legacy prefixed `AI_STT_MODEL` support. No provider, default
model, environment switch, endpoint or deployed resource is changed by this source update.

Realtime WebRTC is a separate optional transport. It requires existing
`STT_REALTIME_ENABLED=true`, an explicit `STT_REALTIME_MODEL`, and a registry provider with a
realtime adapter. This reconciliation implements the Azure adapter only; the current default
OpenAI file-transcription configuration continues unchanged and does not silently become Azure.
Enabling realtime for an unsupported provider fails validation. All environments retain voice
OFF unless their existing, authorized `VOICE_CHANNEL_ENABLED=true` explicitly opts in.
`AI_ENABLED=false` also refuses the voice channel and runtime realtime dispatcher.

A backend with `VOICE_STT_TRANSPORT=server` explicitly retains file transcription via
`STT_MODEL`. Otherwise, an explicitly requested but unavailable realtime configuration leaves
voice unavailable; it cannot silently fall back to the file model or another provider. This
preserves the later phase-9 design rather than restoring the old PR's Azure-only WebSocket
utterance/default-provider implementation.

`GET /skills/voice/status` and authenticated runtime status report local configuration only;
no status request creates a provider session or proves endpoint/model readiness. The obsolete
health probe that treated an inconclusive remote response as deployment missing is not restored.
Current provider existence, supported deployment and positive transcription must be established
separately with authorized synthetic audio before any feature activation or real-provider claim.
The old PR's deployment-missing observation is historical, not current evidence.

The browser sends an SDP offer to the authenticated/capability-gated/rate-limited backend.
The runtime bounds the actual streamed JSON body and the SDP byte length, fixes transcription
session settings on the server, mints an ephemeral grant and performs the provider SDP exchange.
Only the answer and allowlisted model metadata return to the browser. Both credentials stay
server-side; provider errors, SDP, audio and transcripts are excluded from application logs.
Credential-bearing HTTP redirects are refused; normal proxy and TLS checks remain enabled.

An explicit microphone gesture enters permission-pending, then listening. Partial text is
bounded and display-only; no submit control or Assistant action uses it. The local utterance
boundary commits at most once; final text then requires the operator's explicit submission.
The existing policy preview and separate UI confirmation still control clinical writes.
Cancel, hidden tab, resident change, teardown, failed negotiation and disconnect release the
capture and transport; stale callbacks cannot retarget another resident. Existing spoken
preview/readback and typed Assistant paths are preserved.

## Validation boundaries

`flock /tmp/clinicos-browser-qa.lock node e2e/qa-voice-pr-393.mjs --out artifacts/task-validation/voice-pr-393/<fresh-run>` runs only with an owned synthetic PostgreSQL16 container on a dedicated
loopback port and a single browser-stack lock. It never reads the caller's database URL. It
exercises real UI, mic/VAD, backend identity/policy, preview, confirmation and persisted values;
its WebRTC/provider transcript is a deliberately labelled fixture, not Azure transcription.
Python tests separately exercise real ASGI auth/body limits and the adapter HTTP boundary.
The task packet records failures, actual run counts, screenshots/video/trace, source identity,
independent QA and the still-separate real-provider verification requirement.
