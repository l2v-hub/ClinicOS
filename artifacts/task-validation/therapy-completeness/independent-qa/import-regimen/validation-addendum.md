# Independent QA — import regimen stage

Verdict: **FAILED VALIDATION**. This is a passing scoped stage, not a passing whole gate or a production release approval.

Candidate: `f7052f414ee1f0dbc2fa45d86b66463928c2810d`; preceding candidate: `8490fa9b97bbad159dd758aec6fbde3f7f87ea8f`; baseline: `30f0b14d63ae69acec66cd82dcaee1d0abbb1cf6`. Sole QA artifact writer: `/root/therapy_complete_qa`, detached `C:/w-therapy-qa`. Application source and the main dirty checkout were not edited; no push, deployment, real patient, provider, or database writes.

## Contract and review

Read the expanded task contract, issue #432 creation snapshot and previously recorded comments, and all required QA instructions. The expanded contract authorizes only internal parsing/review helpers, not new routes, schema, dependencies, credentials or production changes. The four-file delta preserves the exact original source, removes anchored numbered-list prefixes for extraction, classifies only unmixed positive PRN as `al_bisogno`, leaves every PRN source for manual review, and retains PRN quantity/limits in notes without invented fixed schedules. Negative or mixed instructions remain unresolved with their source/time preserved. No new correctness or security finding in this delta. The previous assigned-therapy stage was reviewed in earlier source-bound reports; it is not newly declared fully verified here.

## Results

| Phase | Result | Evidence |
| --- | --- | --- |
| Contract / diff | Scoped PASS, broader import remains incomplete | `task-contract.md`, `source-receipt.json` |
| Scoped tests | Backend 51/51; frontend 21/21; independent adversarial 3/3; mocked confirmation 9/9 PASS | `logs/backend-focused.txt`, `frontend-focused.txt`, `independent3-rerun.txt`, `backend-confirmation-safe.txt` |
| Types / build | Frontend types + Vite PASS; backend TypeScript + runtime fonts PASS | `logs/frontend-types.txt`, `frontend-build.txt`, `backend-types.txt`, `backend-fonts.txt` |
| Full frontend regression | FAIL: 1309 tests, 1297 pass, 12 fail; exact baseline failure names, zero introduced failures; no waiver | `logs/frontend-full.txt`, `source-receipt.json` |
| Backend broad regression | Incomplete/failed attempt, not entire suite | `backend-selection.json`, `logs/backend-non-db-rerun.txt`, `source-receipt.json` |
| Browser | 4/4 PASS: desktop 1256 and mobile 390, real compiled components with canonical global styles | `logs/browser4.txt`, `test-results/`, `playwright-report/` |
| Security | Scoped PASS: zero scanner findings, checklist below | `logs/security.txt` |

Backend focused discovery includes the four new cases and prior parser/absence tests: the actual independently observed total is **51**, not the implementer's 48. Broad discovery found 236 files; selected 193 excluding only 43 `*-db.test.ts` files. That filename convention does not exclude all DB/auth integration suites. With credentials stripped and only a synthetic loopback port-1 database target, some selected suites failed and eight long-lived processes stalled the runner. The owned run was bounded after more than five minutes, preserving its partial output and exact selection; no final aggregate or full-backend PASS is claimed. The initial actual-DB confirmation attempt independently failed 4/13 assertions (9 passed) on unavailable synthetic database; the safe mocked rerun passed all nine. Database persistence remains unverified.

Two QA helper mistakes were corrected and rerun independently: initial unit import depth and initial Windows loader URL. Their failed outputs remain, not silently replaced. The Vite invocation reports a production client build but the sanitized child environment retained `NODE_ENV=test`; backend Prisma generation was deliberately not run against the shared dependency junction. No exact full package-build/Prisma-generation claim is made.

## Browser and visual evidence

The QA-only surface imports `index.css`, `print-forms.css`, `App.css`, then `design-system.css` in application order. Native Playwright asserted names, original source, manual-review state, selected/unselected PRN controls, zero PRN time inputs, retained mixed `08:00`, quantity/limit notes, disabled verification on incomplete data, and browser-only draft persistence after reload. No console/page errors or relevant HTTP errors; clinical requests synthetic/intercepted, unknown requests and mutations blocked. This is not an API persistence test.

Readable screenshot inspection: mobile positive Epsilon row shows the exact source, selected PRN, no fixed schedule, quantity and limit notes, and disabled verification; desktop mixed Gamma row shows `08:00`, retained "e al bisogno" source/notes, periodical selection, and unresolved review. Negative and mixed rows were also captured on both sizes. No real letters or patient data were used.

## Security checklist

- Secrets: source/build/changed-backend/QA entry/native tests/compiled QA surface scanner zero; execution strips credential-like environment values. Synthetic loopback credentials are not real secrets. Raw broad backend attempt output is local diagnostic evidence, not recommended as a public attachment; use the bounded receipt and focused outputs.
- PHI: synthetic Alfa/Beta/Delta/Gamma/Epsilon and synthetic operator only; no user attachments or actual patient data.
- Logging: no application logs introduced; focused output contains test names/outcomes. No provider request executed.
- Inputs: internal parsing only, no new endpoint boundary; anchored linear prefix matching does not overwrite `originalText`.
- AuthZ: unchanged production permissions; QA capabilities empty and clinical mutations blocked; confirmation owner/role guards mocked and tested.
- XSS/SQL: no unsafe HTML or raw SQL introduced; source rendered as React text.
- Dependencies/config: no schema/env/route/dependency change. QA helpers untracked and not part application build. No production configuration weakened.

## Limits and handoff

All 509 previously sealed artifacts remain byte-identical. New manifest binds this stage and the exact four source blobs. Whole structured therapy import/inventory reconciliation and any real database persistence are not certified; #432 must remain open. The twelve mandatory baseline frontend failures still prevent the complete gate passing. No issue closure, merge or deployment authorization is provided by this report.
