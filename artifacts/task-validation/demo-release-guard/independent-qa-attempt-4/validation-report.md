# Independent QA4 — exact demo release and terminal publication

Verdict: **READY FOR CODEX QA**. All five mandatory gate phases passed on the frozen nineteen-source candidate4. This is the fourth and last reserved implementation attempt; no attempt or review ledger was changed by QA.

Dedicated reviewer `/root/release_guard_qa4`, after root GO on candidate4 manifest SHA256 `e6a33038e749e0a5b8602cf58239851a8ec8ac3d046c4ba7c1971cc7c9ec08fb`. Original baseline `a516d42e31f6674c39c1d130c9706cd80a7ab4c6`; validation binds exact source bytes rather than an unstaged/committed representation. The root may checkpoint the same bytes while this review writes its separate evidence directory. All nineteen source hashes and all108 historical files remain unchanged before and after QA. Historical failed verdicts and original red repro files were preserved.

No source correction, commit, push, PR/issue/settings mutation, live provider call, inference, deployment, Docker operation, token/config access or issue closure was performed by this dedicated reviewer.

## Five-phase result

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS | task-contract.md; original frozen infrastructure contract/plan, all correction and runtime scope addenda, three prior independent QA reports. Frozen issue470 context establishes demo/production separation; this is the separate infrastructure prerequisite and does not complete470. |
| 1 Complete diff review | PASS | audit-notes.md. All nineteen source paths, full release/helper/actual GitHub adapter, four workflows and changed tests reviewed. No further certain correctness finding. Scope remains exactly authorized; no product frontend/schema/data/dependency change. |
| 2 Independent tests/build | PASS | full-ci-unit-tests.log:586 total,583 pass,0 fail,3 native-Windows skips. independent-boundary-probes.log:44/44 pass. historical-reproductions.log:20/20 pass. readiness-http.log:1/1 actual synthetic HTTP pass. backend-types.log and frontend-types.log:zero errors. frontend-build.log:740 modules, production build34.61s. railway-schema-qa.json:3/3 actual GraphQL AST documents valid against pinned official CLI5.66 schema. workflow-parse.json:four YAML files parse. |
| 3 Actual synthetic Playwright | PASS | final-result.png, trace.zip, browser-results.json, playwright-report/index.html, playwright-report/run-summary.json, test-results/*.webm, video-probe.json. Actual frozen production release/proof functions run through localhost:25/25 scenarios,23 correct rejections and2 healthy proofs,0 defects/console/page/relevant HTTP errors; every displayed outcome/value asserted again after reload. Screenshot visually inspected. Valid trace ZIP and real4.4s WebM. |
| 4 Security | PASS | Explicit checklist in audit-notes.md; security-scan.json:299 source/evidence/archive entries including the complete historical task packet,0 token/private-key/signed-JWT findings. Synthetic fixtures only; no real patient data or raw issue-body dumps. No credential forwarding, product authorization bypass, SQL/schema change, new dependency, insecure TLS/shared trust/egress weakening or production QA surface. |

## Independent regression and race results

The unchanged original QA1 cache negatives, QA2 completion/hold/actual-close regressions and QA3 changed-PR/cohort/actual-adapter repros all pass20/20. The known wrong-PR merge and unverified added-issue closure are rejected before mutation. Their historical files were not rewritten to obtain green results.

The new independent44-case suite additionally covers forty injected changes at required-check/final-preflight/deployment-record/publication awaits: PR identity; structurally valid new source issue; scope; implementation plan; grouping; evidence digest; an alternate internally valid clean approval report with matching new ledger digest; implementation ledger; release facts; and even an empty-string durable hold. It invokes the real createGitHub mutation transport. Every intended injection is asserted, no actual merge/PATCH or durable save occurs after the changed verification subject, and original implementation/review lengths remain1.

Four independent real createStateStore/Contents CAS scenarios verify guard-refresh and request-time concurrent root/manual updates, repeated old-body rejection against the original CAS revision, deployment-transition conflict without publication, and legitimate successful record/published retry with no extra issue writes or model/review rounds. The full production suite further exercises all fourteen verification/recovery windows, draft/merge response and post-save alias mutations, every intermediate issue-label operation, other-batch/root/manual CAS updates, actual controller transient503-to-pending-to-protected-retry-to-published recovery, invalid guard rejection and retained status-cache semantics.

The browser is objective local diagnostic evidence: it calls actual current production functions against synthetic HTTP/transport fixtures, then asserts concrete PR/current issue membership, zero merge/closure counts, rejection reasons, healthy deployment UUID and corresponding visible values. It is not a static PASS banner and does not claim to show a real Railway deployment or real GitHub action. Its generated HTML report contains the actual result rows for offline inspection.

## Integrity, execution and remaining root gates

`source-hashes-before.json` and `source-hashes-after.json` verify19/19 exact frozen paths. `historical-integrity-before.json` and `historical-integrity-after.json` verify108 unchanged historical files. New evidence hashes are recorded in evidence-hashes.json. `git diff --check` passed before checkpoint; no QA source modification occurred.

All test subprocesses used env-i with only PATH/TMPDIR and known unreachable synthetic database/test settings where required. Browser additionally received its own task-local PLAYWRIGHT_BROWSERS_PATH. The entire localhost HTTP/browser lifetime held `/tmp/clinicos-browser-qa.lock`; waiting for other groups completed ordinarily. No Docker or shared services were touched. System Chromium and `/usr/bin/ffmpeg` via a task-local cache symlink were used, with no browser install, external font request or TLS exception. Browser routes reject all origins except the owned localhost server. Trace ZIP contents were included in the secret scan.

Actual native Windows and actual GitHub isolated Codex/PostgreSQL/Chromium runtime checks remain later CI gates; the three platform skips are not represented as native passes. Native actionlint is unavailable and not claimed. Actual authenticated repository settings, trusted-main preflight, demo deployment/active UUID, frontend alias/source binding, Claude Max review and issue closure remain root-owned later operations. No external evidence comment was posted because root explicitly owns publication.

This local independent verdict permits the root's final QA/publication decision; it does not declare live activation, Claude approval, deployment or issue resolution.
