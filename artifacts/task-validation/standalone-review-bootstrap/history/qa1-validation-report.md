# Independent QA — implementation cycle 1/4

**FAILED VALIDATION.** Reviewer `/root/standalone_adapter_independent_qa` is independent of the implementer. Thirteen frozen source/test/document files remained unchanged. No production source, author evidence, Git index/state, GitHub, provider, database or model was modified/invoked.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | Original task-contract AC1–AC5, analysis/implementation plan and user handoff requirements read; no UI/application scope added |
| 1 Full diff review | FAIL | F1 durable report bound and F2 historical evidence mutation below |
| 2 Independent tests/build | PASS with regression gaps | full-regression.log: 649 tests,646 PASS,3 existing Windows-only SKIP; frontend-types.log: no errors; frontend-build.log: Vite production build success with existing size/plugin timing warnings |
| 3 Playwright | PASS, explicitly synthetic | Eight browser actions through actual production standalone review/handoff/label/QA modules; persisted state verified after reload; two PNG, trace ZIP and video; zero page/console/relevant HTTP errors in final run |
| 4 Security | FAIL | F2 violates immutable historical proof; F1 can strand a legitimate reserved review. No credential/PHI/API/SQL/provider/config or dependency changes |

## F1 — Valid review cannot be imported for the actual large PR

`agent-team/src/bug-pipeline/standalone-review.mjs:139` applies the normal 100,000-character `safeText` limit to the **entire subject**, including source manifest and every accumulated report. The actual PR393 descriptor initially validates at90,082 compact characters. Adding a schema-valid approved report with a14,624-character summary/result makes the durable subject104,985 characters and throws `unsafe or oversized structured text`. This report is well below review/comment limits. The production importer mutates the in-memory round then its subject validation rejects persistence, leaving the durable reservation running; accumulation across retained rounds compounds the failure.

Proof: `test-results/report-bound-counterexample.json`; initial actual393/491 inputs in `actual-descriptors.json`. Keep normal guards unchanged. Use explicit standalone structural/field sanitization plus a separately bounded aggregate accommodating four legitimate reports, and exercise actual large metadata through request/claim/submit/import/revision.

## F2 — Revision accepts rewritten historical failed evidence

`agent-team/src/bug-pipeline/standalone-review.mjs:377` preserves prior attempt JSON and reports, but does not preserve the hashes/bytes of the historical packet files backing those attempts. A new evidence-only head can change `attempt-1.json`, update its digest and the corresponding `imported-history.json` mapping, retain all three implementation attempt records unchanged, and be accepted by the production adopter. The existing failed history can therefore be rewritten on revision despite the preservation contract.

Proof: `test-results/revision-history-counterexample.json`: `ACCEPTED_REWRITTEN_HISTORY`, three rounds retained, two different failed-evidence hashes, second durable synthetic save accepted. `fixture.mjs` is a preserved copy of the author's synthetic transport used to independently invoke the actual module; no live state was changed. Protect all previously frozen evidence digests/provenance as an immutable prefix, including cross-packet migrations, while allowing appended proof and implementation attempts within the original budgets.

## Actual Git / protocol validation

`actual-git-probe.mjs` reads actual local committed Git trees and blobs for PR393 `d6bb325b1e767c9554e64da433c3f91b0217ee8a` and PR491 `c7ccc7b5a88ca4c6cb1276319f084293f780e5c6`. Production `createStandaloneReview.adopt` and `createGitHub.readFileAtRevision` validate all selected packet digests, complete base/head deltas, tested-source projections and three imported attempts. Results:393430delta entries/18packet files;49147delta entries/12files. Native PR identities/checks/authorization and the CAS store are explicitly synthetic fixtures. This proves the real committed input data is accepted, **not** that hosted adoption, CI, Max review or deployment occurred.

The browser uses synthetic PR81, frozen three-attempt history, authorized owner and native check callbacks. It proves adoption, exclusive ready label, durable running claim, duplicate claim rejection without another round, stale report rejection, valid submission remaining running until import, authenticated reconciliation to `codex-review-ready`, and a declared synthetic independent QA callback reaching readiness while the release hold remains. There are zero actual model calls/GitHub writes/deployments. Native integration tests cover authorization/CAS/nonce/tree/budget and detached real-Git read-only checkout. Infrastructure merge is a guarded exported function, not yet wired to automatic controller invocation; do not claim this adapter automatically merges every standalone PR.

## Evidence integrity / limitations

Final source integrity and evidence media audit/seal accompany this report. The first browser failed before page creation because of an incorrect existing ffmpeg cache path (`browser-first-cache-error.log`); the next reached all protocol states but the QA fixture incorrectly served favicon as an action, producing500 (`first-browser-fixture-error/`, `browser-first-favicon-error.log`). Those artifacts are preserved. Only the QA-owned surface favicon handling/cache configuration changed; final protocol run has zero errors. Build output directory and QA-owned node_modules symlink were cleaned after checks. No application DB was required or accessed. No provider credentials or patient records appear in the fixture.

The main bootstrap remains pending: candidate source is not trusted/main/live until its own genuine review and protected publication. Neither this report nor labels substitute for actual Claude Max review, deployment proof or issue resolution. Author must repair F1/F2 within the same preserved implementation budget, then freeze a new candidate for fresh independent QA.
