# Task Contract

## Task

- Title: Phase 5 Azure gpt-live-transcribe
- Slug: phase-5-azure-gpt-live-transcribe
- Type: feature
- Date: 2026-10-01
- Source: `.ai-prompts/PROMPT_5_VOICE_REALTIME_AZURE_GPT_LIVE_TRANSCRIBE.md` (user request 2026-10-01); handoff `.ai-architecture/phase-4-assistant/PROMPT5_HANDOFF.md`; builds on the merged Phase 5 voice channel (PR #392)
- Branch: `feat/phase5-azure-live-transcribe` (from origin/main bc46c82f)

## Impact Classification

| Area                 |                                                                                           Impacted |
| -------------------- | -------------------------------------------------------------------------------------------------: |
| Frontend/UI          |                yes (WebRTC realtime transport, partial/final transcript states in the voice panel) |
| Backend/API          |                  yes (`POST /skills/voice/realtime-session`, status fields; transcribe route kept) |
| Database/Persistence |                                                               no (audit rows only, existing table) |
| Agnos AI / Chatbot   | yes (runtime Azure realtime adapter: client secret mint, server WebSocket transport, health check) |
| Voice                |                                                                                                yes |
| OCR / Import         |                                                                                                 no |
| Auth / Permissions   |                                yes (ephemeral realtime token issued only behind voice gate; audit) |
| Privacy / Security   |                        yes (no Azure key in the browser; token short-lived; audio flow documented) |
| Config / Env         |                       yes (`AI_STT_PROVIDER`, `AI_STT_MODEL`, `AI_STT_DEPLOYMENT`, transport, VAD) |

## Current Behaviour

Voice channel (Phase 5) uses an utterance upload to the runtime; the only verified STT is Google
Gemini (`AI_STT_MODEL=google:...`, not enabled anywhere). No partial transcripts.

## Expected Behaviour

Default STT = Azure OpenAI `gpt-live-transcribe` (deployment configurable) on the same Azure OpenAI
resource, through the Realtime API GA: browser WebRTC with a backend-issued ephemeral token (key
server-side), partial deltas for UX only, final transcript (after local-VAD commit) reviewed and sent
to the existing Assistant. Server-mediated WebSocket transport (same deployment) for the utterance
path. Gemini only as explicit opt-in, never a silent fallback. Clear diagnostics when the deployment
is missing; text Assistant unaffected.

## Acceptance Criteria

- AC1: provider-independent STT config (`AI_STT_PROVIDER=azure_openai`, `AI_STT_MODEL`/`AI_STT_DEPLOYMENT=gpt-live-transcribe` default); Gemini not default, no silent fallback.
- AC2: Azure realtime adapter: ephemeral client secret mint (WebRTC) + server WebSocket transcription, both from `AZURE_OPENAI_ENDPOINT`, credentials server-side only; non-destructive health check with clear diagnostics.
- AC3: push-to-talk states incl. REQUESTING_PERMISSION, TRANSCRIPT_PARTIAL, TRANSCRIPT_FINAL; partial transcripts never cause actions; only final enters the Assistant.
- AC4: local VAD turn detection commits the turn; silence/no-speech never committed.
- AC5: Prompt §18 A–N: real Azure tests executed when the deployment exists, otherwise marked BLOCKED (not PASS); mock-transport tests clearly labelled.
- AC6: docs/artifacts updated (AZURE_REALTIME_CONFIGURATION.md, STT_PROVIDER_CONTRACT.md, …, PROMPT6_HANDOFF.md), CURRENT_STATE.json fields.

## Test Plan

| Test type                 | Required | Reason                                                                               |
| ------------------------- | -------: | ------------------------------------------------------------------------------------ |
| Unit                      |      yes | session config, realtime event parsing, state machine (partial ≠ action), VAD        |
| Integration               |      yes | runtime WS client vs fake realtime server; backend realtime-session route            |
| API                       |      yes | Azure-dependent: client secret, WS transcription, health (only if deployment exists) |
| Playwright                |      yes | voice UI with mock realtime transport (labelled) + real Azure WebRTC when available  |
| Persistence after refresh |      yes | writes verified in Postgres                                                          |
| Agnos action registry     |       no | Agno unchanged                                                                       |
| Voice simulation          |      yes | Chromium fake mic + fixtures                                                         |
| OCR/import test           |       no |                                                                                      |
| Security/privacy scan     |      yes | no key in browser, token scope/TTL, audit, independent QA                            |

## Evidence Plan

Required evidence:

- validation-report.md
- unit/integration output
- Azure probe / health output (redacted)
- browser E2E report + screenshots
- `.ai-architecture/phase-5-voice/E2E_TEST_REPORT.md`

## Risks

- `gpt-live-transcribe` deployment does not exist in the Azure resource (verified 2026-10-01: DeploymentNotFound; realtime routes 404) → real Azure tests BLOCKED until the owner deploys it.
- WebRTC from tablets through facility networks (UDP) untested.

## Gate Status

READY FOR IMPLEMENTATION
