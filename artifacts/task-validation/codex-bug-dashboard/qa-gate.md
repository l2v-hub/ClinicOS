# Independent QA — issue lifecycle, dashboard and external review bridge

Date: 2026-10-16. Dedicated QA reviewed the user-authorized continuation for existing PR471. QA did not write production implementation, mutate GitHub, claim real bugs, invoke Claude/Codex inference, install a personal cron, merge or deploy. The reviewed files and exact bytes are bound by `qa-reviewed-files.sha256`.

## Phase results

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS: latest external-cron choice, durable lifecycle, verified completion, read-only queue/phase, visible staleness and loopback security. | `task-contract.md`, `implementation-plan.md` |
| 1 Diff | PASS: combined lifecycle/dashboard/external bridge reviewed; listed recovery and race findings fixed. No clinical app, schema, dependency or unrelated cleanup change. | Reviewed files manifest; resolved findings below |
| 2 Tests/build | PASS: independent final112/112 scoped regressions; affected external protocol9/9; independent dashboard cache/failure probes2/2; source syntax,3workflow YAML and3inline JavaScript checks. Clinical app build evidence carried forward because its source/package scope is unchanged. | `test-results/qa-combined-regressions.txt`, `qa-external-review-final.txt`, `qa-dashboard-probes.txt`, `qa-static-checks.txt`; `../codex-runner-activation/test-results/qa-frontend-build-carried-forward.txt` |
| 3 Browser | PASS2/2: actual production dashboard server/client, synthetic lifecycle plus real live read-only GitHub snapshot; concrete values, automatic/manual refresh, reload, stale failure/recovery, external waiting-review and setup status, zero console/page/relevant HTTP errors. Final screenshots visually inspected. | `test-results/qa-browser-external-final.txt`, `qa-dashboard-server.mjs`, `qa-dashboard.spec.mjs`, `qa-playwright.config.mjs`, screenshots and trace/video links below |
| 4 Security | PASS for reviewed preparation scope: fixed-origin loopback read surface, whitelisted DTO, authenticated controller/worker, exact-SHA CAS reservations and hashed reports, no API fallback, no Actions Claude secret, no review/CI/deploy bypass. | Checklist below; actual negative protocol/server tests |

## Resolved findings and recovery invariants

1. Pre-inference label failure previously froze triage as running. Durable `claiming` now retries only status publication; separate `running` CAS precedes model execution. Regression confirms retry without resetting a real model attempt.
2. A deployment-comment failure previously allowed terminal reconciliation to close without links. Shared completion publication now requires matching reviewed/merge/batch SHA and valid required deployment URLs, publishes the idempotent completion comment first, then resolves/closes. Failed-comment retry and missing-URL negatives pass.
3. External `waiting-review` and setup status now render explicit labels; an older failed setup SHA does not falsely describe the current draft as failed.
4. Closed/cancelled source issues now stop both the external worker and controller before review/correction; regression asserts no inference/correction.
5. Worker restores ledger/reports exclusively inside a canonical packet, prepares exact base/head sanitized source diff before reservation, then reserves the shared remote ledger by CAS before inference. Draft/fork/stale SHA, exhausted budget and CAS conflict cannot start the reviewer. Read-only Claude receives source diff without shell access.
6. Publication retries reuse the SHA-bound hashed report without another model call. A before/after GitHub feedback snapshot detects human comments arriving during publication. A COMMENT review alone is never approval: only the validated durable report can approve the exact revision. Corrections repeat tests, simplification, independent QA, fresh SHA and another bounded request.
7. User-owned temporary worktree/runtime is preserved when inference began but completion failed, retaining recovery evidence after a final CAS failure. Normal completed/no-inference cleanup removes only that invocation's owned worktree. No Claude credentials are copied there. The explicit cron `--dry-run` returns a candidate and budget before auth/inference/worktree creation; static review is not a claim that a real personal cron ran.

## Browser proof and provenance

The QA adapter requires `CLINICOS_DASHBOARD_QA=1`, binds127.0.0.1:4399 and imports the production snapshot projection, server factory, HTML/CSS and client. Only the synthetic upstream loader and QA cache interval change. The production15second cache is tested separately:20 overlapping requests plus an immediate refresh cause one upstream load; initial upstream failure yields `ok:false`, `snapshot:null` and a generic error.

Synthetic issue numbers900017–900022 exercise queue3, claim processing2, implementation/validation, external waiting-review, review, merge without resolution, deployed resolution2, blocked1 and queue1. Advancing the browser clock15seconds exercises automatic refresh. Failed refresh and reload preserve the last values with a visible warning; healthy refresh clears it. Injection-like raw titles/private bodies never enter the DTO/DOM. This is synthetic behavior proof, not real issue resolution.

The actual live4317 capture compares every displayed count, row, phase and setup budget with its read-only API, then reloads. It showed queue0, processing0, blocked0, resolved0; four externally managed QA issues441/442/463/464 and467 awaiting activation. Setup displayed Preparazione review esterna and1/4 used. This is the actual pre-Ready snapshot, not a fabricated live workflow completion.

Artifacts: `result.png`, `stale-result.png`, `live-result.png`, `trace.zip`, `live-trace.zip`, `synthetic-video.webm`, `live-video.webm`, `playwright-report/index.html`; originals remain under `test-results/browser/`.

The first browser run failed before page creation because the video recorder was missing (`qa-browser-first.txt`). The official ffmpeg download was denied by network policy and was not bypassed. Existing trusted system `/usr/bin/ffmpeg` was mapped only into the QA browser cache; final tests used `PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` and produced real WebM recordings. Earlier failures and successful reruns remain distinct.

## Security checklist

| Check | Result |
| --- | --- |
| Secrets/PHI/logging | PASS: synthetic fixtures, no patient data; browser DTO excludes titles/bodies/reports/credentials. Review child omits GitHub/deploy/API/OAuth variables and uses the user's existing local subscription config. Public evidence logs contain outcomes/IDs only. |
| Input/AuthZ | PASS: exact Host/Origin and fetch-metadata checks, GET only, fixed assets, authenticated GitHub actor, same-repo open PR/main/head guards, source issue rechecks, bounded attempts and CAS. Dashboard reads never initialize the state branch or mutate GitHub. |
| Injection/XSS | PASS: textContent/DOM rendering, fixed-origin links, no arbitrary asset path or user HTML execution. Controller source diff is data for a read-only reviewer. |
| Dependencies/config | PASS: no new packages; loopback-only listener, no-store/nosniff/restrictive CSP. QA-only surface env-gated. Existing human protections and release gates retained. |
| Review trust | PASS: no self-approval; arbitrary comments never become approval. Exact-SHA structured report/hash/ledger required; report publication retry does not spend another review. Interrupted attempts remain spent/frozen. |

## Actual evidence and limits

QA independently inspected native run38973156720:93 regressions plus real HTTP/PostgreSQL,58 migrations, external direct TCP/UDP/proxy denials, outside-write protection and exit7 passed. This establishes the earlier service/sandbox readiness, not the final112-test commit's native CI; the latter must run after push. Existing basic sandbox assertions remain intact.

The authoritative setup ledger retains one failed authentication attempt on6bedebea6481b895c9b803876d06ec401dcd6e9a; three of four remain. The user chose their own authenticated external Claude Code cron; this QA ran no provider and claims no successful Claude approval, personal cron execution, default-branch activation, resolved real issue, merge or deploy. Required CI, actual external review and existing protected integration/release gates remain prerequisites to those outcomes.

**READY FOR CODEX QA** for this preparation scope and reviewed source bytes. No unresolved source finding remains. This verdict authorizes proceeding to the existing required checks and external review handoff; it is not evidence that the complete live bug/review/deploy cycle has executed.
