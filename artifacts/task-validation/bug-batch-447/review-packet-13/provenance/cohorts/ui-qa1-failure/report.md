# Independent targeted UI QA — implementation 12

**FAIL / not approved for integration publication.** One F12 safety finding has two reproduced callback paths: already-open refusal and supervisor confirmations can still invoke clinical action callbacks after that patient's metadata becomes `temporaryPsExitUnverified: true`. No source fix was made. Root must reserve a follow-up and preserve this failed packet.

## Finding UI-QA1-F12 — P1: stale confirmations remain actionable after PS state becomes unverified

Location: `frontend/src/components/operator/TherapyGiroRows.tsx:430` and `:467`; underlying `administer` callback at `:132`.

The new F12 branch disables the two initial controls when the current patient is unverified. It does not invalidate or guard an already-open refusal panel or already-pending supervisor confirmation. `expandedKey`, `selectedMotivo`, and `pendingConfirm` survive a props refresh. The refusal confirmation's disabled condition checks only the selected reason/note, and its callback calls `onNotAdministered` without checking the latest patient's verification marker. The supervisor dialog stays open; its confirm callback invokes `administer` without checking the current patient marker.

Reproduction A:

1. Render a pending dose with verified/null PS exit state.
2. Open “Non somm.” and select a valid reason.
3. Refresh the same patient/dose with `temporaryPsExit: null` and `temporaryPsExitUnverified: true`.
4. The already-open “Conferma non erogata” control remains enabled. Invoking its actual callback calls `onNotAdministered` once; expected zero.

Reproduction B:

1. Render the same pending dose with `requiresConfirmation: true` and verified/null PS state.
2. Open its administration confirmation.
3. Refresh with the same patient's `temporaryPsExitUnverified: true` metadata.
4. The still-open `ConfirmDialog` callback calls the actual administration callback once; expected zero.

Both safe-expectation assertions fail in `adversarial-final.json` (5 tests, 3 pass, 2 fail). `adversarial.test.ts` executes the actual component render and actual returned event callbacks using a private controlled-hook state harness; it keeps state across the two renders. The harness temporarily supplies the React hook dispatcher in the isolated test process. It does not mock the component logic or alter source. This is a pure render/callback reproduction, not React DOM/scheduler verification, a browser, an HTTP POST, a database test, or proof that the backend would accept either action. Fresh integrated DOM/HTTP/backend enforcement remains necessary later. The source inspection confirms both absent latest-state guards independently of the harness.

A follow-up must gate actual mutation callbacks against the latest patient/dose verification state, including handlers captured before refresh, and safely retain the refusal note/draft with visible explanation or disabled confirmation. It must preserve the existing valid PS pause policy, including allowed “Non somm.” behavior for an explicitly paused patient. No change to backend authority, allergy confirmation policy, route choice, payload/idempotency or unrelated patients is implied by this finding. QA did not implement a fix.

## Fresh execution

All test/type commands used trusted `/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs` `createRunner`, `envMode: verification`, PATH-only parent environment, private runtime HOME, no real credentials, bounded output and timeouts. A private preload disables tsx cache and places temporary files under QA runtime. No install, shared dependency mutation, DB, browser, clinical service, provider, GitHub or model request occurred.

| Receipt | Fresh result |
| --- | --- |
| `targeted.json` | All eight author-selected affected suites: 63 pass, 0 fail, 0 skip, exit 0 |
| `typecheck.json` | Actual frontend project check using root `node_modules/typescript/bin/tsc`: exit 0, no diagnostics |
| `adversarial.json` | First private harness attempt: module-load failure due to reviewer using nonexistent frontend-local React package path; preserved |
| `adversarial-final.json` | Corrected hoisted dependency path: 5 tests, 3 pass, 2 genuine safe-expectation failures above |

The compiler command is `node /workspace/clinicos-497-review1-ui/node_modules/typescript/bin/tsc --noEmit --incremental --tsBuildInfoFile <private QA runtime>/frontend.tsbuildinfo -p tsconfig.app.json`, from frontend. Its only compiler cache is private. The author's earlier compiler failure was a path setup issue (frontend-local compiler absent), not evidence of a missing installed compiler or a failed type check on this source. That prior failed author receipt was preserved and was not relabeled as a pass.

The private import failure was fixed only in QA's harness by resolving React from the existing monorepo root. `adversarial-first-attempt.test.ts` preserves the first harness. No source assertion was weakened. The final additional passing probes cover stable visible record identifiers without DOB, pagination cancellation/saved duplicates, and allergy-read rejection preventing its continuation. No generic full-frontend suite was added after identifying the finding.

## Other reviewed assigned behavior

The exact 14 source files match the author manifest. Local read-only Git base reads verified their before hashes against base `17a127c432f39e094f2746dc33c38bcb234ce719`; all current hashes/sizes match the sealed after manifest. Every path matches the authentic original scope patterns or the two accepted F12 amendment paths. No parent483 re-review was performed.

- F1: actual static render tests show visibly distinct formatted DOBs for same-name patients with no CF/bed, with stable record identifiers when DOB is absent. Giro formats the fallback and sr-only DOB; compact `PatientIdentity` provides the shared fallback consumed by unchanged Consegne. No fabricated DOB was added.
- F3: actual helper tests confirm forward-loaded candidates, then later pages, then wrap only after exhaustion; cancellation, unavailable pages, repeated cursor rejection, unknown/stale counts and saved-patient exclusion remain. No invented backend filter was introduced.
- F7: the paused administration control announces a pause rather than “Erogata”; the visible pause phrase is included in its accessible label. Existing explicit pause decisions are preserved.
- F12: types and parser strictly validate the boolean marker and prohibit an asserted exit decision when true. Fresh initial rendering blocks the affected patient's initial controls and leaves a valid peer actionable. Verification groups also pass through the shared identity parser. This initial-render behavior does not resolve the stale-confirmation finding above.
- F13: the actual documentation render names each allergen once; summary data is not duplicated within each documentation row.
- F14: every newly added color variable (`--blue`, `--blue-dim`, `--amber`, `--amber-bg`, `--red`, `--red-bg`) exists in actual App.css. Added diff lines contain no new raw hex literals. The invalid token fallback additions were replaced. `token-and-scope-review.json` records this check.
- F15: the actual helper is wired into handleSave's awaited allergy re-read, checks sequence/current selection, sets a visible save error and returns before the payload write on supersession. Existing last-moment acknowledgement scope and requestId reuse remain. The pure supersession/read-rejection cases passed. Real window-focus DOM behavior has not been exercised here.
- F16: the affected App.tsx source-regex assertions were replaced with actual rendered facility-day/default/helper behavior in the targeted tests. Remaining style or explicit source-contract assertions were not represented as clinical behavior proof.

## Provenance and freeze

QA nonce `51c9cbbf-990e-4acb-b44e-4b006a229f6d`, canonical reservation `d959fca49d5f52a119015313f921238d7c5692f6`, parent nonce `74494bf0-d5a5-4fa1-ad86-acf0faf1be96`. Authentic author nonce `6fb44467-24c6-42a0-bbad-6bc253bed6cd` is bound by unchanged `ui/reservation.json` to canonical state `0a3f015d12f8abf66745400ea5bb961d01a58ee7`, source base and contract. The original seal/STOP's different nonce remains an acknowledged transcription typo, not a new grant.

Original author seal SHA256 `6291be3c910cc4c1e8238697861cb0f841ae68cdcf190f2c80652d045f5d4c44` and its 15 listed artifacts were verified before/after. Separate correction seal SHA256 `bd583dbcfc5b05136db55814336b1e1ab5d5bc42347668d706b148370d613f2e` and all three listed artifacts were also verified. The correction's authentic reservation/contract/state/source binding and unchanged 14-source assertions were checked. Neither original seal nor original STOP was rewritten; correction proves attribution only, not a new implementation or test run.

`before.json`, `after.json`, and `freeze-comparison.json` show zero changes across 1901 source-worktree files/links, seven worktree Git metadata files including index, 16 original author files, four correction files, and eight contracts/proof/runner records. A supplemental 16-file old-proof freeze was established after initial test execution, checked against the original author's before-freeze hashes and byte counts, and rechecked unchanged at completion (`old-proofs-before.json` / `old-proofs-after.json`). It includes the actual immutable Claude findings and original cohort contracts/reservations; active sibling appended outputs and other isolated source worktrees were excluded. Dependencies were read through existing links, not edited or generated in shared modules.

The actual Claude report was treated as findings data. Root's integrated branch and other siblings were neither reviewed nor approved by this isolated-source result. QA ran no Git status, index/ref write, source fix, canonical/GitHub/provider operation or clinical runtime. Only private QA outputs/cache were written. The previously read setup skill required no install or environment draft change.

## Limits and next owner

Author's 63-pass receipt is prior sealed evidence; `targeted.json` is a fresh independent execution. Author's first two test failures and compiler-path failure remain preserved. No browser/DOM focus, clinical HTTP, PostgreSQL interleavings, fresh captures/media, eight-issue integrated E2E, native gates, actual Claude2/Codex review, protected-main release or issue closure was performed or claimed. Root owns the separately reserved source correction and subsequent integrated clinical verification. Current UI source remains FAIL until the F12 stale-action issue is corrected and independently rechecked.
