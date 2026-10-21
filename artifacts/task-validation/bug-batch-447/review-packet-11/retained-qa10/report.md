# Review report: PR #497 packet 10

**Candidate status: PRIVATE REVIEW CANDIDATE; readiness PENDING.** This packet combines the preserved original eight issue acceptance matrix from packet 9 with one new independent actual browser result for the import allergy journey. No approval, merge, deployment, or issue closure is claimed.

## New browser result

At source `74b260cdbcf36b1f7395477f4e35d07aba7fcf90`, one independent browser invocation passed desktop and tablet (2/2). After reload, desktop showed `Paziente nega allergie`; the real `Allergie e Intolleranze` dialog had `paziente_nega` selected with the exact hint. Tablet showed `Allergie assenti (verificato)`; the same real dialog had `assenti` selected with the exact hint. API persistence passed for both; no relevant HTTP failures or browser console errors occurred. Migrations and synthetic seed passed and four document jobs reached the local mock runtime. The four selected screenshots show the summary and post-reload dialog for both viewports. Full sealed report/STOP and exact hashes are copied under `provenance/`.

## Retained original eight issue evidence

Issues #447, #451, #452, #453, #454, #456, and #457 each retain the independent QA4 canonical `PASS_SCENARIO` with 17 receipts total, DB33 `PASS33/33`, and build pass. Those scenarios were not rerun by follow-up 10. Issue #486 retains QA4’s actual Milo failure and its aggregate `FAILED` verdict; QA5 then passed the scoped compatibility correction, 11 affected HTTP cases, 3 Milo/route cases, the 8-criterion recorded matrix, and 6-criterion lifecycle. QA5 attempts 1–4 remain preserved, including strict assertion failures and the pagination omission. The packet9 exact report and evidence index are copied for issue-level criteria and provenance.

## Author validation and unrun items

The follow-up author report remains `IMPLEMENTED — NOT VERIFIED`: syntax passed, while the pure journey test returned 2 passes and 1 stale `accept-demographics` assertion failure. That expectation was absent in pre-edit source. Independent follow-up 10 actual browser evidence is separate. Unrun: unchanged broad frontend/backend suites, native release checks, author pure journey test (2/3), and provider/external actions. Packet9 also discloses its unrun QA5 supplements and external OCR/provider exclusion.

## Release gates

Parent #483 writer-fix integration, current native checks, exact-source Claude review, root review, publication, deployment, and issue-closure decisions remain pending. The source test delta only changed `e2e/import-happy-path.mjs`; no application source change is included.

Raw traces, SQL, runtime logs, credential values, and provider output are not included. The screenshot fixtures are synthetic. Packet 9 and sealed QA10 source evidence were frozen before assembly and checked again after assembly; see `source-preservation-before.json` and `STOP.json`.
