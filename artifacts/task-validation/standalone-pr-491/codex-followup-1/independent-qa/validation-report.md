# Independent QA — PR #491 follow-up

**Verdict: READY FOR CODEX QA**

Scope reviewed from base `c7ccc7b5a88ca4c6cb1276319f084293f780e5c6`: `.github/workflows/inspect-demo-source-topology.yml`, `scripts/automation/inspect-demo-source-topology.mjs`, and `scripts/automation/inspect-demo-source-topology.test.mjs`. No source edit was made during QA.

| Phase | Result | Evidence and limits |
| --- | --- | --- |
| 0 — Contract | PASS | Read the supplied validated contract at `/workspace/clinicos-demo-source-topology/artifacts/task-validation/standalone-pr-491/codex-followup-1/task-contract.md`; reviewed AC1–AC4. Remote issue/GitHub state was not queried under this QA assignment’s no-GitHub restriction. |
| 1 — Diff review | PASS | Full base-to-working diff contains exactly the 3 authorized paths above. Workflow now isolates its group from the backend deployment group. Inspector sets pagination completion only after its bounded page traversals return and computes accessibility separately. No correctness or scope issue found. `git diff --check` passed. |
| 2 — Build and tests | PASS for touched scope | Independently ran `node --test scripts/automation/configure-demo-source.test.mjs scripts/automation/inspect-demo-source-topology.test.mjs`: 127 passed, 0 failed, 0 skipped. Frontend build is outside these JavaScript workflow/controller changes. An attempted `npm run build` in `frontend/` could not start because this checkout has no installed frontend dependencies (`tsc: not found`); the `npx tsc --noEmit` attempt likewise could not resolve a local package. This is recorded as an environment limitation, not as a source pass. |
| 3 — Playwright evidence | PASS | Local-only QA surface imports the production inspector/client, uses a synthetic in-process GraphQL fixture and redirects every transport request to loopback. Nine scenarios plus a browser reload assertion made 73 loopback requests. It asserted concrete rendered values, repeated the inaccessible-environment result after reload, and recorded zero console errors, page errors, or relevant HTTP 4xx/5xx. Result screenshot, trace ZIP, HTML report, raw results, and short video are linked below. No live provider, credential, patient, or deployment was used. |
| 4 — Security | PASS | Reviewed the full source diff and all generated evidence, including decompressed trace archive members. No real credentials or PHI found. Fixture-only private error text is not surfaced in the receipt. No endpoint, auth, schema, dependency, or production config was changed. The operation remains read-only and project-wide visibility remains unproven with service connect disabled. |
| 5 — Decision | READY FOR CODEX QA | AC matrix and machine-readable artifact/source seals accompany this report. This is a QA handoff only; no issue closure, merge, push, or release is claimed. |

## Commands and results

- `node --test scripts/automation/configure-demo-source.test.mjs scripts/automation/inspect-demo-source-topology.test.mjs` — PASS, 127 tests.
- `git diff --check` — PASS.
- `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/clinicos-batch450-playwright flock -n /tmp/clinicos-browser-qa.lock bash -c 'PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/clinicos-batch450-playwright node /workspace/.clinicos-cloud/pr491-followup-independent-qa-20261018/probe.mjs'` — PASS, 9 scenarios, 1 reload assertion, 73 loopback requests, 0 unexpected browser errors.
- `ffmpeg -v error -i <video.webm> -f null -` — PASS; video decoded.
- `unzip -t <trace.zip>` — PASS; every member passed CRC checks.
- `npx tsc --noEmit && npm run build` — blocked before compilation because no local `tsc` dependency is installed and npm could not create `/home/agent/.npm/_cacache`.
- `npm run build` — blocked with `tsc: not found` in this checkout. Frontend build does not exercise the changed workflow/controller scope.

## Objective artifacts

All paths below are under `/workspace/.clinicos-cloud/pr491-followup-independent-qa-20261018/`:

- Final result screenshot: `screenshots/result.png` (inaccessible visible environment; complete pagination; accessibility false; project-wide visibility unproven; service connect false).
- Additional scenario screenshots: `screenshots/`.
- Playwright trace: `trace/trace.zip`.
- Playwright-style HTML run report: `playwright-report/index.html`.
- Raw scenario and request results: `browser-results.json`.
- Short browser video: `video/page@d6cb818363d885b003f44ce927762c05.webm`.
- Browser probe: `probe.mjs`.
- Acceptance matrix: `acceptance-criteria-matrix.md`.
- Privacy, integrity, source, and artifact manifests: `privacy-scan.json`, `historical-proof-preservation.json`, `source-digest.json`, `artifact-manifest.json`, and `seal.json`.

The only material limitation is that no frontend dependency install exists in this checkout, so a frontend build could not run. The changed controller/workflow suites ran independently and passed. Hosted project-wide Railway visibility and credentialed workflow execution remain unproven by design.
