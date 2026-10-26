# Task Contract

## Task
- Title: Codex model output policy 20261026
- Slug: codex-model-output-policy-20261026
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
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

`createModels()` configures the process runner with a 64 KiB total stdout+stderr ceiling. Codex `--json` progress is ordinary stdout, so a legitimate session that emits more than 64 KiB is terminated before its separate structured result file can be read. The historical production failure exact cause is unknown; this contract covers the reproducible candidate only.

## Expected Behaviour

Model sessions may emit up to the established 2 MiB total process-output ceiling while retaining bounded 32 KiB tail captures per stream and enforcing a separate fatal 64 KiB stderr ceiling. Other runner callers retain existing defaults. Sanitized categorical diagnostics expose operation, exit/error class, failure category and byte/capture counts without raw output, provider text, credentials or clinical data.

## Acceptance Criteria

- AC1: A synthetic child emits more than 64 KiB of JSON progress and then writes a schema-valid typed result; the model call succeeds and retained captures stay bounded.
- AC2: Model output over 2 MiB, stderr over 64 KiB, timeout, and invalid/missing/oversized/symlink structured results fail closed. Existing process-group termination and non-model runner defaults remain unchanged.
- AC3: Model failures preserve `model-execution-failed` and emit only finite categorical diagnostics with bounded integer counts; collection is capped at 64 entries.
- AC4: Exact main CLI flags, typed-result schema/size/path guards, and model timeout are unchanged.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Validate runner option limits, capture tails and finite error classification. |
| Integration | yes | Use real synthetic child processes to exercise progress, output/stderr limits, timeout and process-group cleanup without provider calls. |
| API | no | |
| Playwright | no | |
| Persistence after refresh | no | |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | |

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

## Risks

Bounded tails may omit early diagnostic context; preserve terminal tails and byte counters. The independent stderr ceiling and total output ceiling remain fatal. No provider call or clinical worktree is part of verification.

## Gate Status

READY FOR IMPLEMENTATION
