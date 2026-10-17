# Cycle 2 correction and settings scope addendum

Baseline remains a516d42e31f6674c39c1d130c9706cd80a7ab4c6. Independent cycle1 FAILED VALIDATION: live no-store check accepts cacheable directive lookalikes. Preserve independent-qa and original source-hashes.json as historical candidate1 evidence; record candidate2 separately.

Correct the exact cache directive parsing and retain independent RED regressions. Expand only the two settings files listed below to complete the user's explicitly authorized required-check settings: append bug-pipeline-tests, secret-scan, frontend-tests, archive-tests, gate, browser-e2e bound to GitHub Actions15368; preserve all existing checks, stricter/human review requirements, bypass actors and default permissions. Every appended job is unconditionally emitted by the existing pull_request workflow (no path filters). Do not require opt-in real-provider. Verify every effective check, idempotence, wrong binding/read/access failures before mutations. Existing configure-repository dispatch performs the authenticated admin operation only after reviewed code is on main. Direct current integration attempt returned403 and did not mutate settings.

Additional files:
- scripts/quality-gate/configure-bug-repository.mjs
- agent-team/tests/bug-pipeline/repository-settings.test.mjs

No new workflow, secrets, data/schema changes, review budget reset or live deployment authorization in this correction. Current clinical groups stay manual and unreleased. Fresh independent QA required after stable candidate2.
