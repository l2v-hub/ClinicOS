# Task Validation Report

## Task
- Title: Therapy completeness
- Slug: therapy-completeness
- Commit: 89888589ef1fcce8f200899aa07413c8bcb70325
- Date: 2026-10-10

## Implementation Summary

Frontend candidate preserves every saved prescription in the complete plan, retains period-applicable PRN in week view, exposes prescriptions absent from the dose feed read-only, and rejects short terminal full-list reads. This is a partial implementation of issue432, NOT a production release or a complete import fix.

## Files Changed

Current candidate contains26 scoped application/test files (8 backend,18 frontend). No API/schema/config/dependency changes. Existing launcher line-ending changes are excluded and preserved. Candidate8490 also committed the already-staged historical244proof files; these remain historical14a evidence, not fresh validation or a production release. Incremental sections below retain historical results against their actual source versions.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PARTIAL | New structured inventory reconciliation retains exact extracted variants/occurrences, unknown fields and mandatory review; scoped import/refresh/conflict/confirmation probes pass. Real DB persistence and existing legacy-draft reconciliation remain unverified; OCR cannot certify source completeness. |
| AC2 | PASS scoped | focused46 tests, root6 actual-component browser scenarios; full108 fixture includes106 active and2 inactive, later cursor values, retry and patient switch. |
| AC3 | PASS scoped | Root desktop/mobile week PRN includes101 and104 once;104 has no today action, future-week PRN has no action. |
| AC4 | PASS scoped | Missing001 remains source-only/read-only while feed000 is represented; no fabricated administration ID/action. Independent same-fascia second occurrence and foreign patient probes. |
| AC5 | PARTIAL | Count-mismatched printing reads rejected in unit tests. Imported excluded/incomplete/conditional entries remain explicit by existing validation; broader import ambiguities unresolved. |
| AC6 | FAIL | Independent mandatory QA is FAILED VALIDATION;12 global-suite baseline failures and broad import acceptance remain. No production deployment. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS scoped | Root46 focused and independent46+5 adversarial, all pass. |
| Integration | PASS scoped | Real compiled therapy components use guarded synthetic transport; every medication ID/name asserted. |
| API | NA | No API changes; no clinical network requests or database writes. |
| Playwright | PASS scoped | Root6 candidate scenarios; baseline1 positive reproduction; independent10 +2 readable scenarios. Global styles input addendum is required before publishing visual evidence. |
| Persistence | PASS limited | Synthetic inventory re-read after browser reload; not evidence of real database persistence/authentication. |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | PARTIAL | Parser audit reproduced loss after an incomplete blank-separated paragraph, missing names in numbered rows, and intentionally ambiguous combined row. No model/OCR provider invoked. |
| Security/privacy | PASS scoped | Frontend/source/build/QA fixture secret scanner0 findings; explicit deny-all capability map, no mutation traffic, synthetic identities/drugs only. |

## Historical Runtime Evidence — 14a03038

Root and independent types/build pass. Full candidate frontend:1308 tests,1296 pass,12 fail,0 skipped. Fresh exactbase30f run:1299 tests,1287 pass,12 fail; failure-name sets equal,0 introduced failures (commands/regression-comparison.json). This comparison does not waive mandatory QA failure or claim a globally green suite.

Baseline actual-component browser reproduces100 displayed rows while later101 is absent, no week PRN section, and missing-feed001 absent. Candidate browser assertions show the corrected behavior. Runs serialize clinical browser access and allow only local static GET/public fonts through; all clinical responses are synthetic interception.

Unrelated PR431 at a9e05053031ff0c540e786d6a250edb87d224d98 was read as context for existing baseline errors; it is not merged, approved or included in this candidate. Its in-progress CI and Fixes429 language do not certify required physical-device/human audit checks.

## Logs

Only sanitized logs are allowed.

Initial QA harness omitted a public font allowlist and produced6 console-error failures; no application mutation followed. Explicit public-font GET allowance corrected the harness and the final6 scenarios passed. A mistyped local contract checker path failed; the actual validate-task-contract.js subsequently passed. Application types/build had one initial JSX delimiter error before the local candidate commit; corrected source and final checks pass.

## Residual Risks

Structured inventory reconciliation is implemented locally and under fresh independent QA. Existing parser guard intentionally stops after prose (#296) and remains unchanged. Extracted items absent from heading-derived narrative are mandatory-review candidates with blank prescribing fields, not actionable prescriptions. Existing legacy drafts are not retroactively rewritten or certified. Numbered names and explicit PRN mapping pass scoped tests. Same-fascia repeated occurrences remain read-only when the current backend identity cannot represent them; no second actionable administration is invented.

No real-patient records, original document/session, authentication policy, credentials, API routes, schema or database were changed. Current candidate changes deterministic backend parsing only, as explicitly scoped in the contract extension. Main remains30f0b14; candidate is isolated. Overall goal stays active and issue432 stays OPEN. Automation is not resumed. No production release while the independent gate fails.

## Final Decision

## Incremental Validation — f7052f4

Canonical CSS was included in both root/independent browser surfaces. Historical14a mobile PRN card overflow failed geometry. The canonical ds-btn--wrap follow-up8490 passed root6+geometry and independent14 browser checks;174 styled and184 wrap artifacts were copied byte-for-byte, preserving original151 artifacts. These manifests retain their actual historical candidate hashes.

Currentf705 adds numbered-list prefix handling with exact original text and explicit unmixed PRN regime preservation. PRN remains mandatory-source-review; negative or mixed scheduled-plus-PRN instructions are not auto-converted. No clock times or fixed PRN quantities are invented. Root48 backend parser tests,21 frontend review/confirmation/glucose tests,46 display-focused tests, frontend/backend types and frontend production build pass. Root2 desktop/mobile actual discharge-review scenarios and fresh6 display scenarios pass, including values, original source, disabled unreviewed confirmation, unchanged PRN after browser-only draft reload, bounded PRN-button geometry and no clinical mutation traffic.

Fresh independentf705 QA is sealed in independent-qa/import-regimen/import-artifact-manifest.json:94 new artifacts,509 historical hashes preserved;51 backend focused,21 frontend focused,3 adversarial,9 mocked confirmation and4 responsive browser tests pass. Types/build and security scan pass. Full frontend1309/1297PASS/12FAIL/0skip has exactly the baseline failure names, not a global PASS. A broad backend subset attempt stalled and was bounded; real DB confirmation is not verified. The mandatory independent verdict is FAILED VALIDATION. Raw broad-backend logs are deliberately not publication evidence; the bounded source receipt records selection, failure and coverage limits.

Numbered-name and PRN paths in historical import-audit.json are superseded only by the new scoped tests. The structured inventory and prose-delimiter reconciliation remain unimplemented; see import-reconciliation-plan.md. Raw ambiguous multi-drug text remains explicit review, not automatic splitting. Main30f remains unchanged and no production promotion or issue closure occurred.

A frontend-specific secret scanner was once misapplied to the whole backend and flagged existing server-only env references/test literals. The correctly scoped scanner over frontend source/build, both changed backend files and new synthetic tests passes0 findings. No existing secret exemptions were changed.

PARTIAL

Mandatory independent QA verdict: FAILED VALIDATION. No completion/deployment/issue-closure claim.

## Structured Reconciliation — 89888589

Candidate0c6a7e added inventory reconciliation; db0de575 corrected refreshed pending-proposal provenance;89888589 restored original source inside the summary diagnostic field and reinforced immutable originalText in the shared row guard. The actual draft service already rejected originalText tampering: the independent helper adversarial case is a defense-in-depth gap, not proof of an endpoint exploit.

Meaningful structured items remain exact, React-escaped evidence labelled as automatically extracted, never fabricated verbatim document text. Stable identities include extraction payload and duplicate occurrence. Same-group conflict selection must match the exact variant; refreshed proposals carry current hashes while operator-reviewed values/exclusions remain intact. Legacy new-draft seeding is covered; existing legacy drafts are not silently modified.

Root reconciliation-verbatim-guard:67 backend tests,26 frontend tests, both type checks and Vite build PASS, with the exact precommit diff recorded. The old summary escaping/source assertion passes unchanged. Root prior0c6 four desktop/mobile review/proposal/summary browser cases PASS; these are not relabelled as898 evidence. Root0c6 full frontend1314/1301PASS/13FAIL included one newly introduced summary regression plus baseline12. Final898 full frontend1314/1302PASS/12FAIL/0skip exactly matches baseline failure names, with no new failure (reconciliation-final-regression/comparison.json).

Fresh independent final898 QA sealed134 artifacts:67backend/26frontend/10adversarial/1actual-service-with-mocked-persistence/6native-responsive-browser tests PASS, types/build and secret scan PASS. Its full frontend independently matches1314/1302PASS/12FAIL/0skip and remains FAILED VALIDATION with no waiver. Independent artifacts are copied byte-for-byte under independent-qa/reconciliation;10PNG/6trace.zip/6WEBM and native HTML report retained. Root visually inspected the bounded mobile source evidence. Both browser lanes stopped/released. No globally green result, database/provider/authentication proof or production release is claimed.

Read-only remote refresh at18:02UTC: main remains30f0b14, issue432 OPEN with no comments, candidate branch not yet pushed. Separate PR431 now has head2a9a677861b02a0fa45d34eb03b486ca5340bb77 with successful current checks (earlier failed browser references above are historical). It is not merged or part of this source; its checks do not certify this candidate. Its audit leaves physical-device checks outstanding. Fresh queue includes P1 issues433,434,440; no duplicate writer started.
