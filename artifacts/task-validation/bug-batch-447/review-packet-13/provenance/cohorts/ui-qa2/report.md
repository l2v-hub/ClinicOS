# Independent UI QA2 — F12 stale confirmation follow-up

**PASS for the exact isolated UI follow-up source and pure/type verification.** The two UI-QA1-F12 callback failures are resolved, including callbacks captured before the refresh. No new blocking finding was observed in the targeted scope. This does not approve an integrated branch or claim DOM, browser, clinical HTTP/PostgreSQL, E2E, deployment or closure success.

QA reservation nonce `ca9b9595-ff4e-4fe9-8b49-f4ceeb714442`, canonical reservation `0382d96eed257f84053353923ee2584a3f25cfea`, source worktree `/workspace/clinicos-497-review1-ui`, base `17a127c432f39e094f2746dc33c38bcb234ce719`. QA contract SHA256 `40dfc0ab6e407457b678c766cc0a0f9b0aabac738b97e58b7fd0f43e2fa0568f`. Author follow-up seal SHA256 `746bc25005c14ed6c45f43ca41548d21d6af06115d50b6b0be090faf3366d6f4` verified with every listed artifact before and after.

The only follow-up changes are `frontend/src/components/operator/TherapyGiroRows.tsx` (SHA256 `9b42aa04f39f22a88a4088ce9631c57c33c1aad0aba0431fd8bd6c2f659f636a`, 25641 bytes) and new `frontend/src/components/operator/__tests__/claude1UiStaleConfirmation.test.ts` (SHA256 `335709183179a819590973118d4a4889d9a63f34d4f458cf161d2b253392cde1`, 8094 bytes). The other 13 prior UI source files, including the earlier regression tests, remain unchanged. All 14 exact prior source copies are preserved and authenticate against the original author manifest. `followup-source.diff` and `source-review.json` record the comparison. Source is now 15 affected UI files relative to the original base; this approval is for their exact current hashes, not a newly invented commit SHA.

## Fresh verification

All commands used trusted `/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs` `createRunner`, `envMode: verification`, an actually constructed PATH-only parent environment, bounded output/time, and private runtime HOME. A private preload disables tsx's cache and moves temporary files into this QA directory. The frontend compiler uses the existing root-linked TypeScript package with `--noEmit`, `--incremental`, and a private tsbuildinfo path. No shared dependency install or generated client/module write occurred.

| Receipt | Independent fresh outcome |
| --- | --- |
| `targeted.json` | 73 tests passed, 0 failed, 0 skipped, exit 0 |
| `typecheck.json` | Full frontend tsconfig.app type check: exit 0, no diagnostics |
| `adversarial-latest.json` | 6 additional private callback tests passed, 0 failed, 0 skipped, exit 0 |

The 73-test command includes the nine affected source suites plus the original QA1 `adversarial.test.ts` unchanged. Its five original cases now pass, including the exact two previously failing safe expectations. No original assertion or failed record was modified. The new six private cases run the actual component render and returned callbacks with controlled hook state; they cover retained direct administration handlers after unverified/absent patient refresh, glucose confirmation both with/without supervisor, refusal handlers after absence/completion/date/hour changes, supervisor handlers after completion/hour/verified pause, note persistence and explicit resubmission after verification recovers, and verified-pause refusal plus a valid patient's confirmation when another peer is unverified.

There were no failed QA2 executions. The earlier QA1 import setup failure and actual 3-pass/2-fail clinical callback regressions remain sealed history. Author's 73-pass/type receipts are prior evidence, not this reviewer's execution; the three receipts above are fresh independent runs. The 73 includes the original five QA cases; it is not 73 plus another uncounted rerun of those same five.

## Source semantics

The component refreshes a `latestActions` ref synchronously from current patient/dose props on every render. Action identity includes patient, therapy, fascia and scheduled time; its expected context additionally includes date and hour. `actionAllowed` fails closed if the current action is absent, no longer pending, in a different context, or belongs to a PS-unverified patient. Administration also fails on a verified PS pause, while refusal retains the previously authorized pause policy.

Central `administer`, supervisor confirmation, glucose confirmation, and refusal confirmation consult this current ref before their callbacks. The guard therefore applies to actual retained old closures as well as newly rendered buttons. The original two QA failures now invoke zero callbacks. Missing current patients and completed/changed dose contexts also invoke zero callbacks in independent tests.

The already-open refusal panel preserves selected reason and note while its confirmation becomes disabled and a visible status explains the block. The supervisor dialog remains open with `confirmDisabled` and an explicit unavailable-state explanation, including when the current patient disappears. Shared ConfirmDialog already implements that prop and was not edited. A verified peer remains actionable. Recovering verification does not submit automatically: the note remains and a new explicit confirm action is required. An explicitly verified PS pause still permits “Non somm.”; no blanket block or automatic active-PS decision was introduced.

The earlier F1/F3/F7/F13/F14/F15/F16 and strict F12 parser/type changes remain intact and their targeted regression cases passed. No backend, PS context/modal, parent483, provider, schema, controller, or clinical policy implementation was re-reviewed or changed here. The controlled-hook harness is a pure local state/callback technique, not actual React DOM, scheduling or browser behavior. It does not demonstrate a clinical POST or database acceptance.

## Preservation and provenance

`before.json`, `after.json`, and `freeze-comparison.json` show no change across 1902 checkout files/links, seven worktree Git metadata files including HEAD/index, 16 original author files, four original nonce-correction files, 26 QA1 failure files, 33 follow-up author files, the 16 original immutable proof files, and nine contracts/reservations/ref/runner records. Hashes, sizes, inodes and modes were compared. Active sibling worktrees/private appended evidence were excluded.

All four original/correction/QA1/follow-up seals and their artifacts were verified. Original author seal `6291be3c910cc4c1e8238697861cb0f841ae68cdcf190f2c80652d045f5d4c44`, separate attribution correction `bd583dbcfc5b05136db55814336b1e1ab5d5bc42347668d706b148370d613f2e`, and original FAIL seal `e5b546a8cd5642d92ecc53e07746b9f3284024289e2cea53880df4781aef139f` remain unchanged. The original nonce typo is still preserved and is not interpreted as a new grant. Current author reservation `c45b47e0-e827-4485-a53c-c3dddc9fe054` / state `0d0583b7233c7fe1fb73ce241147b40d714c8d9a` bounds the narrow source correction.

One nonblocking metadata precision: the author's run-targeted wrapper constructs its runner with `process.env` while labeling its receipt “PATH-only.” The trusted verification mode still constructs an allowlisted child environment; this is not evidence of a credential leak. This report does not repeat the literal parent-environment label as a verified author fact. QA2 itself constructs only PATH and obtains independent 73/6/type passes. No author packet was rewritten for this observation.

Only this private QA2 directory/cache was written by the reviewer. No source fix, Git status, Git/index/ref write, canonical/GitHub/network/provider operation, clinical HTTP, DB, browser, server or runtime was performed. The previously read setup skill required no installation or environment configuration change.

## Remaining gates

This local PASS resolves UI-QA1-F12 in the frozen source. Root alone owns subsequent integration/publication. The earlier unpublished integrated candidate is not certified by this result. Actual integrated DOM/focus/modal events, clinical HTTP and PostgreSQL interleavings, fresh browser evidence for impacted patients/issues, native gates, actual Claude2/final Codex review, protected release and closure remain unrun by QA2 and must be assessed on the exact future integrated source. No inference of clinical E2E success follows from these pure/type passes.
