# Independent QA — minimum intake identity

Verdict: **READY FOR CODEX QA**, with an explicit pre-existing regression-suite waiver for the release owner to acknowledge. No deployment is authorized or performed by this QA session.

Source: baseline `54d65b24304be50b191ffcec874f2e25a8b43bf8` plus the ten scoped uncommitted frontend files in `independent-source-receipt.json`. SHA256 receipt covers each changed file, all tracked frontend source/config inputs and QA harness inputs. Aggregate frontend input identity: `58549d37d7959ede5cf0d057e2778b3378c519d4a7c2e515aba582e0a01e2d95`.

## Gate phases

| Phase | Result | Evidence |
|---|---|---|
| 0 Contract | PASS | AC1–4 independently examined; `validate-task-contract.js` reports CONTRACT VALIDO. Initially incorrect impact/test tables were corrected before final verification |
| 1 Diff review | PASS | All ten frontend diff files reviewed; no backend/schema/API/env/dependency edits; `git diff --check -- frontend` clean |
| 2 Types/build/focused tests | PASS | Independent `tsc --noEmit`, `tsc -b`, Vite production build, 108 intake/demographic tests and 24 backend compatibility tests, all exit0. Updated required-identity guard independently passes |
| 2 Full regression | BASELINE WAIVER REQUIRED | Independent current-source run: 1152 tests, 1140 pass, 12 fail, exit1. Same twelve failure names as prior independent source54d evidence; not a clean full suite |
| 3 Browser/persistence | PASS | Real current-source IntakeWorkspace with canonical styles; 18 concrete browser checks, screenshots, trace, video, HTML assertion report and JSON results; no browser/runtime/HTTP errors |
| 4 Security/privacy | PASS | Explicit checklist below; frontend secret scanner exit0, zero findings |

## Acceptance criteria

| Criterion | Result | Independent proof |
|---|---|---|
| AC1 Four identity fields mandatory | PASS | Exactly four aria-required controls; each missing field blocks despite legacy acceptance; malformed fiscal code and future DOB block |
| AC2 Other unavailable data optional | PASS | Four fields alone enable Crea paziente with absent phone, sex, birth place, admission, allergies, therapies, diagnoses, vitals and modules; no demographic acceptance button or empty-therapy acceptance gate |
| AC3 Coherent UI, reload and confirm | PASS | Summary shows actual identity and ready creation; optional phone/email/address autosave, reload and confirm payload preserve exact values; empty optional phone sends null, no therapy invented; desktop and390px mobile evidence |
| AC4 Clinical/import safety | PASS | Actual therapy still requires acceptance; invalid accepted therapy remains blocked; pending therapy import and document field proposal block; invalid supplied phone blocks; focused tests retain source review, deferred therapy and CAS gates |

## Browser surface and evidence limits

The QA-only Vite surface imports the actual IntakeWorkspace, not a replacement form. App/index/design-system styles are loaded, canonical stylesheet last. Browser traffic to localhost:3001 is intercepted with a synthetic draft adapter; PATCH revision updates survive `page.reload()` and the real confirm request payload is asserted. This is **mocked transport persistence**, not real database persistence, and does not certify full-SPA authentication, actual OCR services or production behaviour. No production endpoint or real patient data was used. Backend compatibility tests stub all persistence delegates and do not require a database.

The new four-field requirement is specifically the new-intake UI policy. The shared validator default remains progressive for legacy patient edits and import-review callers; this change does **not** add a new server API mandate. Actual prescription safety remains unchanged. The therapy section still offers an optional empty-therapy confirmation button, but it no longer blocks creation.

Artifacts, relative to this report:

- `screenshots/minimum-identity-ready.png` — exact summary identity, no therapy, ready and enabled create
- `screenshots/optional-values-reloaded.png` — all four required labels and saved optional contact values after reload
- `screenshots/mobile-minimum-ready.png` —390px operational layout with enabled creation
- `trace.zip` — final successful run
- `video/` — recorded WebM runs; successful final run captured
- `test-results/browser-results.json` —18PASS checks and empty error arrays
- `playwright-report/index.html` — assertion HTML report
- `logs/qa-types.log`, `logs/qa-build.log` — successful silent TypeScript commands
- `logs/qa-vite-build.log` — successful production bundle, existing size warnings
- `logs/qa-focused-tests.log` —108/108PASS
- `logs/qa-backend-compatibility.log` —24/24PASS
- `logs/qa-full-regression.log` —1140PASS/12knownFAIL
- `independent-source-receipt.json` — exact current source inputs
- `qa-browser.mjs`, `qa-surface.tsx`, `qa-surface.html`, `qa-server.mjs`, `qa-commands.mjs`, `qa-receipt.mjs`, `qa-regression.mjs` — reproducible local-only infrastructure

Screenshots were visually inspected after loading canonical styles. Earlier harness startup/path, phone-format and singular-wording assertions were corrected as QA infrastructure issues, not application fixes. `screenshots/failure.png` and earlier videos are retained transparently; the final trace/results/report and named screenshots come from the successful final run. The loopback server5184 was stopped after verification.

## Regression baseline disclosure

The twelve unchanged failures are: assessmentCatalogUi module; canonical design-system source guard; schedule session-safe source guard; fiscal-code provenance source guard; six multi-patient parameter source guards; assistant classic fallback; weekly/monthly therapy date guard. Prior source-bound evidence is in `../insulin-online-integration-20261008/independent-qa-report.md` and `../insulin-online-integration-20261008/test-results/candidate-guards.log` for exact source54d. Fresh current run reproduces the same failure names; this QA does not claim they are fixed or silently waive them.

## Security checklist

| Check | Result |
|---|---|
| Secrets | PASS: no credentials in diff or new harness; frontend scanner reports zero findings |
| PHI | PASS: synthetic fixtures only; none of the user's real identity/CF/address copied into code or evidence |
| Logging | PASS: no new app logging; QA output contains test names/outcomes, synthetic-only screenshots |
| Boundary validation | PASS: four-field opt-in, CF checksum and DOB validity preserved; optional supplied phone validation retained; no endpoint modified |
| AuthZ | PASS: no role/session/auth routes changed; existing operator headers preserved; mock surface not evidence of auth enforcement |
| Injection/XSS | PASS: React text rendering remains escaped, no raw HTML or SQL added |
| Dependencies | PASS: no manifest/lockfile additions; existing local Playwright and Vite reused |
| Configuration | PASS: no CORS/env/prod flags modified; QA surface restricted to artifacts, loopback and unshipped scope |

No correctness defect introduced by the scoped diff found. Code may be reported as locally verified once the gatekeeper explicitly accepts the existing twelve-failure baseline limitation. No commit, push, production change or online availability claim is made here.

**Codex must now re-run the QA Gate.**
