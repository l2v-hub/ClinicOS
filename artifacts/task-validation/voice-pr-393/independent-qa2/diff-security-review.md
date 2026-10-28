# Independent QA2 diff and security review

Reviewed25 frozen source/test/doc/runner paths against main299ba8 and the exact candidate1→candidate2 manifest difference. Tracked full diff saved in test-results/full-tracked-diff.patch; nine additional untracked source paths reviewed individually and bound in full-diff-scope.json. The historical livePR393 body/comment/review metadata was read from GitHub. Its Azure-default/server-WebSocket/deployment-missing claims are superseded by current optional provider-neutral source and must be rewritten at publication; they are not current provider evidence.

## Two-file correction

useVoiceChannel.ts:77–78 keeps latest reducer state in a ref. Lines273–290 snapshot whether the current capture is actually committed, matching captureId and TRANSCRIBING **before** stopAll invalidates commitAt. Only that committed-empty path dispatches transcribed(empty); uncommitted LISTENING/PARTIAL buffer errors dispatch failed, retaining reducer invariants instead of admitting premature finals. All provider callback generation/resident guards remain. The other changed path is the actual browser regression, adding15 checks for four early errors, committed-empty/retry and screenshot framing. The other23 declared sources and three contracts match first-QA bytes. No reducer/provider/auth/clinical policy change in candidate2.

## Full candidate boundaries

| Check | Result / concrete boundary |
| --- | --- |
| Provider/model/defaults | Existing runtimevoice/stt.py and all other unmodified tracked inputs match299ba8. Registry adds optionalAzure adapter, realtime.py:18–61 uses explicit flag/model and configured registry provider, no network from status/no fallback. validate_ai_config refuses unsupported/missing realtime settings. Feature remains defaultOFF; no envfile mutated. |
| Auth/ACL/rate | backendhttp.ts:326–358 uses existing identity, voice.plan, channel switch and shared rate limit before SDP buffering; real owned-PG negative cases rerun. Runtimeapp.py:341 authenticates before streamed reads. All new audit values are correlation/identity/outcome/transport, not SDP/audio/transcript. |
| Bounds/secrets | SDP64KB UTF8, JSON streaming+4096 overhead bound before parsing, runtime/provider response96KB, parser12K event and2K transcript bounds. Fixed provider errors and server-side APIkey/ephemeral grant. Azure_NoRedirect + HTTPS endpoint validation prevents credential redirect. No change of TLS/CSP/network credentials. |
| Lifecycle | Generation/permission gate/owned pendingstream, current processor and abort/timer/seq/resident guards reviewed. Old AudioContext rejection cannot release new capture. Candidate2 terminal-state correction assessed against real browser, not copied reducer tests. |
| Clinical write boundary | Only final after actual local commit may become editable. Explicit send and separate existing operator confirmation required; partials are escaped React text, no rawHTML/SQL in product. SQL QA uses new empty owned synthetic database. Exact120/80 and persistence asserted. No speech-driven confirmation. |
| UI/scope/hygiene | Existing Assistant/nav/design tokens retained, additive partial styles only. No dependencies/schema/lockfile/VITE_API_URL/CSP/env activation. No transcript/debug logging. One nearby formatting-only proactiveDeps wrap has no behavior impact. Source scope authorized by PRreconciliation. |
| Safe QA ownership | Globalflock covers containercreate→migrate→seed→backend/browser→teardown. Dedicated loopbackports, random ownership marker, containerID/label verification; no callerDATABASE_URL fallback, nodev5432/Railway/realmodel. |

Actual Azure transcription and real provider/RTCPeerConnection compatibility remain NOT RUN. This gate can certify optional local implementation only, never production readiness or historical missing-deployment diagnosis. No correctness/security finding from the readonly full diff at this stage; final verdict depends on actual runtime/media outcomes.
