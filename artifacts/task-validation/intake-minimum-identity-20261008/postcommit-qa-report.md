# Independent post-commit QA

Verdict: **READY FOR CODEX QA** for exact committed application source `318b81a056897bb5c3f4bae273f1225febca8297`, with the same explicit twelve-failure baseline waiver. This supersedes the pre-commit source identity for release validation; the historical receipt remains unchanged.

Baseline: `54d65b24304be50b191ffcec874f2e25a8b43bf8`. Candidate Git tree: `88717a16c0240016472c338a7931a5fd9b47fef8`. Current frontend input SHA256: `bcfb4cf5f284a2eed4239412634395d83194776f45fdb93c15d7186905021073`.

`postcommit-source-receipt.json` binds all current tracked frontend inputs, all ten changed application/test paths and the committed browser harness. Application paths were clean before testing and remained clean after testing; every frontend input hash was independently rechecked after the browser run. The only browser-script transformation redirected its output folder to `postcommit/`; assertions and application source were unchanged.

| Gate phase | Result | Fresh evidence |
|---|---|---|
| Contract | PASS | Existing AC1–4 are the verification scope; the user's subsequent publish authorization belongs to the release owner, not this QA worker |
| Exact committed diff | PASS | Ten frontend files only, prior scoped behavioural changes plus commit-hook formatting; committed frontend diff whitespace check passes |
| Types and production build | PASS | `postcommit/logs/types.log`, `build-types.log`, `vite-build.log`: exit0; existing chunk-size warnings remain |
| Focused tests | PASS | `postcommit/logs/focused-tests.log`:108/108; `identity-guard.log`:1/1; `backend-compatibility.log`:24/24 |
| Full regression | KNOWN BASELINE LIMITATION | `postcommit/logs/full-regression.log`:1152 total,1140 pass,12 fail, exit1. Exact twelve prior baseline failure names remain; no new failure |
| Browser UI and mocked persistence | PASS | `postcommit/test-results/browser-results.json`:18PASS, zero console/runtime/HTTP errors; fresh trace, video, screenshots and HTML report |
| Security/privacy | PASS | `postcommit/logs/secrets.log`: zero scanner findings; no app auth/config/dependency/backend changes; synthetic fixtures only |

All acceptance criteria were reasserted against the **committed** React workspace: exactly four required controls, each missing identity field blocks, complete identity alone permits summary and creation, absent optional fields do not block, supplied invalid phone/CF/DOB still block, optional phone/email/address survive draft reload and confirmation payload, actual therapy acceptance and invalid-therapy checks remain, and pending therapy/document import decisions still block. Desktop and390px mobile screenshots are fresh. `postcommit/screenshots/optional-values-reloaded.png` was visually inspected and shows the four required labels, optional contacts and enabled creation.

Fresh evidence paths relative to this report:

- `postcommit/screenshots/minimum-identity-ready.png`
- `postcommit/screenshots/optional-values-reloaded.png`
- `postcommit/screenshots/mobile-minimum-ready.png`
- `postcommit/trace.zip`
- `postcommit/video/` — final recorded WebM
- `postcommit/playwright-report/index.html`
- `postcommit/test-results/browser-results.json`
- `postcommit/logs/` — all independent command output
- `postcommit-source-receipt.json`
- `postcommit-revalidation.mjs` — reproducible exact-source verification runner

Limitations remain explicit: draft GET/PATCH/confirm transport is mocked with synthetic data, so reload evidence is not a real database-persistence claim. The actual IntakeWorkspace and canonical styles are used; this is not a full authenticated SPA/OCR-provider end-to-end run. Four-field mandatory policy remains scoped to new-intake UI, without a new server API mandate. The full suite is not clean: assessmentCatalogUi module, design-system source guard, schedule session source guard, CF provenance guard, six multi-patient parameter guards, assistant classic fallback and weekly/monthly therapy date guard remain baseline failures.

No application edits, commits, pushes, production calls or deployments were performed by this QA session. The loopback QA server5184 was stopped after testing. Release owner may proceed with the user-authorized deployment only after acknowledging the existing baseline limitations and using this exact committed source identity.

**Codex must now re-run the QA Gate.**
