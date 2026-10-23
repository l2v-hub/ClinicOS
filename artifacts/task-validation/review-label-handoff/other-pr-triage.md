# Read-only triage: non-batch open PRs

Snapshot: 2026-10-17 16:49 CEST (Europe/Rome). Repository `l2v-hub/ClinicOS`.
Baseline inspected: `main` / `origin/main` **299ba8ff8d048631cdb969f26656d02de981da83**.
Scope: PRs **#468** and **#393** only. No GitHub/source/status mutation, model invocation,
provider call, test execution, deployment or PR closure was performed. This is analysis,
not a QA pass or an authorization to change existing durable batch ledgers.

## Inventory and evidence method

GitHub currently has four open PRs: #483, #481, #468, #393. Read both other PR bodies,
comments, reviews (none), full change lists/diffs, latest checks and mergeability; compared
GitHub source blob SHA values with `git ls-tree -r origin/main`. Read current trusted
Codex controller and issue-review-sync workflows and the current ClinicOS/bug-triage skills.
Downloaded historical #393 failed CI aggregate logs read-only; raw logs remain private in
`/tmp` because test logs include fixture data. Historical CI is not a current validation run.
GitHub API compare metadata and the untruncated #393 source tree were checked.

| PR | Head | Relation to baseline | Current review/check observation |
| --- | --- | --- | --- |
| #468 | `7ee7f5559eea4df01ba604a68645876ffdeb434d` | 1 ahead / 37 behind | No reviews. Historical 2026-10-13 checks green; no current `bug-pipeline-tests` result. GitHub mergeable=true, mergeable_state=blocked. |
| #393 | `4eec7f9223edd69ce7b614752646c7ee1bb76e82` | 1 ahead / 170 behind | No reviews. Historical 2026-10-01 gate FAIL, browser/real-provider SKIP. GitHub mergeable=false, mergeable_state=dirty. |

No exact changed-path overlap between #393 and either #481 or #483. #468 only adds its own
workflow/docs/packet and likewise shares no exact changed paths. This does not prove their
combined runtime safe: they still share CI, authorization, runtime and issue lifecycle.
Keep the normal batch controller as sole owner of #481/#483.

## PR #468: cloud Routine on every new issue

Intent: add `.github/workflows/claude-issue-trigger.yml` calling an Anthropic Claude Code
Routine `/fire` endpoint whenever a non-Bot opens an issue; Claude then implements it and
opens a PR. Four added files, 181 lines. No application code or database changes.

This is **not an exact-source duplicate already merged**: both the workflow and
`docs/claude-issue-trigger.md` are absent on baseline main. It is a **superseded design**:
current `.github/workflows/codex-bug-pipeline.yml` authorizes Codex implementation via
maintainer `codex-run` / exact `/codex fix`, batches similar work and uses the external
already-authenticated Claude Max worker for final review. The new user-requested
`claude-review-ready` / `codex-review-ready` handoff belongs in that existing owner flow.
Merging #468 unchanged would add a second independent implementation dispatcher.

Concrete concerns from source:

- Any GitHub User who can open an issue can trigger the paid/session-producing call;
  the only actor check is `user.type != 'Bot'`. No maintainer authorization, opt-in label,
  grouping, current batch occupancy check, durable budget or review-SHA binding exists.
- The worker receives the entire issue text as model input. Shell variable+jq handling
  avoids direct shell interpolation, but that is not authorization or model prompt-injection
  defense. The claimed remote Routine prompt/capabilities were not independently inspected.
- It requires a different Routine token/ID and a cloud endpoint, not the user's existing
  local Max review harness. No current billing/authentication claim is established here;
  do not add Anthropic API key fallback or ask for more secrets to revive this design.
- The existing validation report explicitly says live GitHub issue → Routine session was
  NOT RUN. Its claimed local simulation payload path is not among the four published files.
  It lacks the current independent visual QA evidence for internal automation.
- `printf ... | head -c 30000` under `set -euo pipefail` can also terminate an oversized
  payload path on upstream SIGPIPE; truncation must be tested rather than called universally safe.

Recommended disposition: document it as obsolete relative to the authorized current design,
with a link to the replacement handoff implementation; have the owner decide whether to close
it as superseded. Do not mark its original AC implemented or auto-merge it merely to clear
queue. This report does not close it. If a cloud Routine dispatcher is intentionally retained,
that is a separate contract change requiring authorization, scope aggregation, durable
idempotency/budgets and end-to-end proof before merge.

Minimal owner task/file map:

1. Use existing `agent-team/src/bug-pipeline/` controller/review modules and
   `.github/workflows/codex-bug-pipeline.yml`, `codex-issue-review-sync.yml` as the only
   orchestrators; reconcile requested handoff labels, authorized comments and current-SHA
   structured reports with the existing ledger. No #468 trigger is needed for local Max.
2. Update `docs/codex-bug-workflow.md` and reviewer prompt with the selected protocol.
3. Publish provenance comment on #468 explaining the design replacement, without saying
   the original cloud Routine was activated or proved.

Model routing: a small executor is suitable for a precisely specified documentation or
fixture step. Authorization, competing-owner prevention and review-state transition design
need senior orchestration/review. Required evidence for replacement automation: authorized
and unauthorized actors, issue+PR feedback, duplicate delivery, stale SHA, active worker,
conflicting labels, report validation, failed run and bounded retry; actual safe browser
surface plus sanitized state/log proof. Real Max success must be established by the local
worker, not replaced by a fixture or a green label.

## PR #393: old Azure Realtime implementation

Intent: Azure `gpt-live-transcribe` as default STT; browser WebRTC with server-side SDP
negotiation; backend/runtime health and realtime routes; partial/final transcript states;
server-side WebSocket utterance transport. 46 changed paths, 4,096 additions/292 deletions.
Voice stays explicitly off by environment. The PR itself states real Azure deployment was
missing in its 2026-10-01 check; that is historical evidence, not a fresh provider diagnosis.

It is **not fully superseded or already merged**. Of its **21 executable source/test/script
paths**, **0** have identical blob SHA on current main: **16 differ**, **5 are absent**:

- `clinicos-ai-runtime/clinicos_ai/voice/azure_realtime.py`
- `clinicos-ai-runtime/tests/test_voice_azure_realtime.py`
- `frontend/src/components/assistant/voice/realtimeTransport.ts`
- `scripts/voice/azure-stt-check.mjs`
- `scripts/voice/voice-realtime-e2e.mjs`

However, main subsequently introduced a newer provider-neutral architecture in commit
`1bfdd0b1d4d86ba5537ccc366866afc447cec45c` (2026-10-02). Exact inspected symbols:
`clinicos_ai/voice/stt.py:stt_model` chooses `STT_PROVIDER`+`STT_MODEL`, legacy prefixed
`AI_STT_MODEL` remains supported; `_adapter` uses `models/provider_registry.py`; Azure
is `voice/providers/azure.py`, OpenAI/Google have separate adapters; `stt_realtime` is a
separate explicit opt-in with `STT_REALTIME_ENABLED` and `STT_REALTIME_MODEL`.
The PR's old `AI_STT_PROVIDER=azure_openai` default and direct Azure realtime branch in
`voice/stt.py` must not overwrite this subsequent configuration/provider contract.
Existing main routes include authenticated `/v1/voice/stt-status` and utterance transcription;
the new realtime routes are not already present. Existing privacy and mic cleanup behavior
must be preserved while adapting the new transport.

Historical CI diagnosis, from run **36829793448**, not speculation:

- Backend reported 1,599 tests, 1,579 pass, **19 fail** (remaining category not recast PASS).
- Failures included import ownership contracts, assessment immutability/replay and a child
  process resolving `backend/backend/src/assessments/service.ts`, intake NRS legacy history,
  therapy validation/idempotency, patient ownership/ACL, diary pagination, and missing
  therapy drug name validation. Do not declare these all baseline without controlled repro.
- Browser E2E and real-provider jobs were skipped after gate failure. Vercel preview readiness
  and the old Python runtime test success do not make the full feature verified.
- The PR body reports older mock browser 34/34 and Azure missing-deployment error path 5/5.
  These prove neither current integrated source behavior nor successful real transcription.

Necessary plan, in a separate authorized voice worktree after rechecking file ownership:

| Step | Exact affected area/file map | Executor complexity | Acceptance/evidence |
| --- | --- | --- | --- |
| Reconcile configuration/design before code | `clinicos-ai-runtime/clinicos_ai/voice/stt.py`, `models/provider_registry.py`, `voice/providers/azure.py`; `.ai-architecture/phase-5-voice/` + current phase-9 docs | Senior | Keep current provider registry, explicit configuration, privacy defaults and no silent provider fallback; document supported transport/model contract. |
| Adapt Azure adapter and authenticated routes | PR-only `voice/azure_realtime.py`; `clinicos-ai-runtime/clinicos_ai/api/app.py`; `backend/src/voice/stt.ts`, `backend/src/skills/http.ts` | Senior implementation or tightly split small executor with senior review | Server-only credentials and ephemeral token, bounded SDP/audio, auth/ACL, cancellation/timeouts/rate limits, meaningful provider failure classification and no PHI/audio logs. Unknown provider existence remains unknown. |
| Integrate browser lifecycle | `frontend/src/components/assistant/voice/{realtimeTransport,audioSession,useVoiceCapture,useVoiceChannel,voiceApi,spokenStatus}.ts`; `VoicePanel.tsx`; `assistant/AssistantMode.{tsx,css}` | Senior for session/race lifecycle; small executor for isolated pure parsing tests | Partials display-only; final requires operator confirmation; silence does not dispatch; cancel/navigation/error/disconnect releases tracks; preserve typed Assistant and authorization. |
| Focused regression and isolated stack | `clinicos-ai-runtime/tests/test_voice_azure_realtime.py`; `backend/src/voice/__tests__/voice-e2e.test.ts`; `frontend/.../voice/__tests__/voice.test.ts`; `scripts/voice/{azure-stt-check,voice-realtime-e2e,voice-browser-e2e}.mjs` | Small executor once the exact contracts/fixtures are frozen | Real mic synthetic fixtures, permission denied, delayed final/cancel, auth negative, provider failure, display/final values, text fallback, no accidental writes, console/network and mic cleanup assertions. Owned synthetic QA DB only. |
| Independent QA and real-provider verification | SHA-bound task packet, current native checks, screenshots/video/trace and provider report | Independent senior QA/Claude review | Fresh integrated SHA; current required checks; actual allowed deployed provider success with synthetic audio, or explicitly verified feature-off/failure behavior under a contract that does not claim successful transcription. |

Do not rebase/merge the old branch mechanically: GitHub currently confirms merge conflicts,
and 170 baseline commits plus 16 divergent executable files require controlled reconciliation.
Do not enable voice globally, provision a paid model deployment, or infer clinical speech rules
solely from this triage. No claim that the current provider remains missing: make a fresh
read-only authorized provider inspection in the proper environment if implementation proceeds.

## Handoff conclusion

Both PRs are inventoried; neither is currently safe to auto-merge unchanged. #468 has an obsolete
conflicting dispatcher design; #393 is a genuinely unmerged feature requiring senior architectural
reconciliation and fresh integration/QA, not a bounded Luna-only patch. These facts do not justify
closing issues or resetting any existing implementation/review budget. The coordinator can
continue the tested normal batches and handoff automation independently while allocating the
separate voice plan and recording a truthful per-PR dashboard.
