# Analysis — PR #393

Read PR body/comments and full historical diff; baseline provider-neutral commit supersedes old Azure-as-default selection. Historical CI failure does not establish current baseline. Read relevant ClinicOS, agent-loop-quality-gate, qa-gate, playwright-evidence and final-review skills.

## Source and feature map
- Runtime: models/provider_registry.py optional realtime adapter path; models/validation.py allows realtime only for an implemented adapter with complete safe configuration; voice/realtime.py generic guarded dispatcher; voice/azure_realtime.py Azure SDP/client-secret adapter; api/app.py bounded authenticated route. Provider capability matrix declares only the implemented optional Azure transport; production runbook points to adapter-gated configuration. Existing voice/stt.py selection and transcribe are preserved except safe additive status metadata.
- Backend: voice/stt.ts additive optional provider negotiation and uncached guarded runtime status; skills/http.ts reuses identity, voice.plan, per-env flag and existing rate limit.
- Frontend: voice/realtimeTransport.ts; voice/audioSession.ts; voice/useVoiceCapture.ts; voice/useVoiceChannel.ts; voice/voiceApi.ts; voice/VoicePanel.tsx; AssistantMode.tsx/.css and spokenStatus.ts minimal state integration. Existing spoken preview behavior must survive.
- Tests: independent bounded parser/reducer tests; Python realtime config/provider/HTTP tests; backend client and route tests; synthetic real-component Playwright fixture with screenshot/video/trace.

No exact path overlap with frozen patient/therapy groups. Existing shared App.tsx/schema/OCR source are outside scope. No existing group ledger is reset. Root must verify integrated main and protected checks at publication.

## Risks and alternatives
1. Do not cherry-pick old 46-file commit: 16 executable paths diverged and new phase-9 registry must remain authoritative.
2. Restoring Azure as default would silently change privacy/cost/provider contract; rejected. Realtime opt-in uses existing flags and separate realtime model.
3. Old health treated inconclusive probe as deployment_missing; rejected. Report local configuration separately from unknown remote readiness; optional provider diagnostic cannot claim a successful transcript.
4. Old transport had pre-aborted signal/listener races, unbounded negotiation promise, disconnect timer leak and provider-controlled error messages; harden rather than copy blindly.
5. Captures must be invalidated synchronously before resident transitions/cancel; no pending permission streams left alive or late final accepted. No client-side secrets/remote provider HTTP URLs.
6. Current text/spoken preview behavior and default server path preserved; no duplicate vendor knowledge outside registry/adapter.

## Evidence limits
No current Azure binding/value has been retrieved. No actual provider call has been made or claimed; pure/loopback/browser fixtures will be marked synthetic. Provider success is a separate prerequisite for claiming real transcription. No development/Railway DB or paid resource provisioning permitted.
