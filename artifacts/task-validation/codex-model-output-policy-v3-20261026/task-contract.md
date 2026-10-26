# Task Contract

## Task
- Title: Codex model output policy v3 20261026
- Slug: codex-model-output-policy-v3-20261026
- Type: bugfix
- Date: 2026-10-26

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | no |

## Current Behaviour

Codex model stdout and stderr share a fatal 2 MiB ceiling even though stdout progress is streamed and retained only in bounded tails. Failure classification also treats bare HTTP-like numbers anywhere in retained stderr as provider status codes. The runner has a 64 MiB input guard; tracked production callers use configured 1 MiB defaults and explicit limits up to 40 MiB.

## Expected Behaviour

Model stdout remains streamed and byte-counted but is excluded from fatal output limits; its owned tail stays capped at 32 KiB. Model stderr remains fatal above 64 KiB, with the 30-minute timeout and process-group termination retained. Default runner callers preserve combined output limits and prefix capture. Status-code classification requires an anchored status prefix. Typed result size/schema/path/symlink guards remain unchanged.

## Acceptance Criteria

- AC1: A fake Codex child can emit more than 2 MiB of stdout progress and write a valid typed result; the model operation succeeds while reporting the full stdout byte count and retaining no more than 32 KiB.
- AC2: Model stderr above 64 KiB, timeouts, malformed/oversized typed results, and legacy combined-output overflow remain fatal; default capture remains a prefix.
- AC3: Incidental stderr lines containing 401 or 503 classify as `other`; anchored HTTP/status codes retain their categories and delegate cooldown behavior.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Runner/model tests cover streaming limits, classification, and capacity routing. |
| Integration | yes | Real synthetic child process exercises stdout/stderr and typed-result file channels. |
| API | no | |
| Playwright | no | |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | No auth, CLI, provider, or secret-handling changes; diagnostics remain finite categories and counters. |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified
- exact-source inventory of all production runner output limits
- red/green output-policy test results and source hashes

## Risks

Un untracked external config override could provide a value above 64 MiB to the generic runner. The tracked schema has no upper bound; tracked configuration and production calls are at or below 40 MiB. Keep the existing guard unless an actual tracked caller regression is found. Streaming stdout still consumes bounded per-chunk work; retained memory is bounded by the configured tails.

## Gate Status

READY FOR IMPLEMENTATION
