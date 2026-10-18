# PR495 continuation 3 — fresh independent QA

Verdict: **READY FOR CODEX QA**. No source correctness or security finding in this bounded continuation. This is offline validation, not release approval, clinical E2E, live bearer capability, provider schema acceptance, or deployment proof.

Subject: `efd9e1a4e5ddab4488a1911f40718a14ec143014`; comparison: `ba5b512f63720e09e09afd53ec69d3cd5f36aec1`. Dedicated QA reservation `889f5d9f-2f11-48d0-a79a-3f10dda820b3`, durably reserved and readback verified before this independent session. Author already stopped. Contract SHA256 `dd6ad7e99fb31488f6c76fa817544b1ff78377a95132eb37d69463ac50f7a0bd`; author freeze SHA256 `b2ccc64d832d0fbbcf20022cf2d84d1c98bfee0859e69e7608729ad334f43783`; author seal SHA256 `aac1f9dd0eab85ae19c0039d6bc6df909975f8373f213083d937361c443310d4`.

| Phase | Result | Evidence |
| --- | --- | --- |
| 0 Contract | PASS — read original readiness contract, both continuation contracts, and actual review 6255118871 | Task contract remains unchanged; before.json, after.json |
| 1 Full bounded diff | PASS — exactly two changed paths against comparison SHA; nine source lines and focused test changes reviewed | before.json, after.json; source commit |
| 2 Tests | PASS — final 122 workflow + 20 topology + 24 independently authored actual CLI cases = 166 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo | workflow.tap, topology.tap, independent.tap and corresponding result JSON |
| 3 Internal QA surface | PASS — actual fresh suite/CLI results rendered on owned ephemeral loopback; values/visibility, failure filter, all-cases control, reload asserted | browser-lifecycle.json, public/qa-result.png, browser.mjs; raw trace private |
| 4 Security | PASS — explicit checklist below | CLI transcripts, artifact-validation.json, harness-freeze.json, cleanup.json |

The changed source is `scripts/automation/inspect-demo-bearer-readiness.mjs`; its existing test file is the only other source change. QA made no production/test/workflow/helper/contract edits. Frontend build, application stack, provider, database, dependency and external network actions are outside the expressly bounded task and were not run. Required validation here is the exact two-file workflow command plus existing topology and new adversarial CLI checks. No frontend/backend/schema/runtime behavior changed.

| Acceptance criterion | Result and independent evidence |
| --- | --- |
| Preserve helper-owned diagnostics in project() | PASS — private WeakSet identity membership rethrows only locally minted errors; duplicate distinct and identical trigger cases both emit DEMO_BEARER_DUPLICATE_TRIGGERS |
| Keep trigger/pagination/domain/target guards | PASS — incomplete pagination, malformed edge collection, too many edges => TRIGGERS; malformed page flag => METADATA; missing/duplicate domain => DOMAINS; malformed/poisoned domain => METADATA; wrong environment/project/service/trigger owner => TARGET |
| Normalize foreign projection errors | PASS — getter throwing poisoned Error, foreign Error with lookalike DEMO_BEARER_TARGET message, and malformed null edge emit fixed phase RESPONSE_INVALID; no trust based on message/code |
| Missing identity data.me | PASS — absent or null me => DEMO_BEARER_IDENTITY_RESPONSE_INVALID; absent id remains existing METADATA behavior, explicitly tested |
| CLI failure channel | PASS — 22 independent failure cases each status 1, exactly two constant stderr lines (annotation plus same code), empty stdout, no receipt; poisoned messages/URLs/extensions never reflected |
| Success and public whitelist | PASS — fresh actual CLI success emits identical receipt/console marker, drops identity/private fields/synthetic token values; mode0600. Existing suite asserts exact nested key lists, frozen/minted receipts, forged receipt rejection, exclusive write and bound credential checks |
| Explicit public metadata decision | PASS — concise emission comment references unchanged codex-followup-1/task-contract.md:11. Public logs can persist beyond artifact retention. Fixed operational metadata/validated trigger policy/provenance/access booleans remain intentional; no arbitrary provider/identity/config fields authorized |
| Read-only safeguards | PASS — existing 122 tests verify exact endpoint/headers/queries/context/main freshness, two matching snapshots/drift rejection, bounds/timeouts/response/redirect and finite errors; false access remains observation and skips inventory when environment denies access. Independent success/false-access tests retain serviceConnectAllowed/mutationAllowed/deployVerified false, visibility unproven |
| Preserve historical proof and source boundary | PASS — all 64 prior Git blobs SHA256 and byte counts verified before and after (sparse absent files read with git show HEAD:path); any present working copy also checked. All automation source/helper/workflow/contract seals unchanged; every author-sealed file rechecked. before.json and after.json |
| Dedicated concurrency unchanged | PASS — exact two-file workflow test command includes dedicated demo-bearer-readiness vs production concurrency and credential-free test order assertions; workflow untouched |

Final commands used the trusted `/workspace/clinicos-review-handoff/agent-team/src/bug-pipeline/process.mjs` createRunner with `envMode:'verification'`, owned runtimeRoot, minimal PATH and process.execPath (Node v24.19.0). No controller credentials were passed. Explicit CLI credentials in the new harness are invented QA-only strings. Provider responses are synthetic in-process fetch fixtures; no provider request is performed.

Exact workflow command: `node --test scripts/automation/configure-demo-source.test.mjs scripts/automation/inspect-demo-bearer-readiness.test.mjs` (122 tests). Existing topology command: `node --test scripts/automation/inspect-demo-source-topology.test.mjs` (20). Independent `node --test <owned QA root>/adversarial.test.mjs` (24). Browser/artifact checks are functional validations, counted separately with no invented test counts.

All attempts retained, without relabeling:

1. QA attempt 1 underlying exact workflow command passed 122/122, exit 0. The QA result parser expected TAP `#` summaries; Node24 emitted spec `ℹ` summaries, causing a harness assertion after the successful test command. Original output, zero-valued original parser record, before/after and original freeze remain in attempt1-* files; attempt1-harness-failure.json records the diagnosis. Corrected parser accepts both reporters, then refroze before rerun.
2. QA attempt 2 passed 122+20+24 and browser/artifact validation. The browser lifecycle detail file shared a name with the runner result and was replaced by that result; all attempt2 evidence/harness files are retained privately in attempt2/. attempt2-harness-observation.json records this evidence-only collision. Browser output renamed, refrozen, and full final validation rerun.
3. Final QA passed 166/166 and both functional browser/artifact checks. harness-freeze.json preceded all final commands; source/tests/harness stayed frozen. These are the authoritative final outputs, not an aggregate of repeated tests.

Author history is separate: author focused bearer-file runs were 15 tests per run, first two exit1 with stale expectations and third 15/15 exit0, as recorded in the unchanged author freeze/seal. Those are not described as 122 or 166 tests. Prior implementation/continuation evidence and prior actual Claude changes-requested reviews remain historical records, unchanged.

| Security check | Result |
| --- | --- |
| Secrets | PASS — credential-free verification environment; invented fixtures only. Exact error assertions prohibit stack/message/URL/reflection. Public summaries contain only case labels/codes/booleans/counts; raw trace remains private |
| PHI | PASS — no real patient/provider/config payload; viewer consumes only synthetic CLI status/code observations and test counts; fresh sentinel binds capture |
| Logging | PASS — bounded constant failures and existing explicit public metadata allowlist; identity and extra provider keys discarded; existing tests assert full nested output keys |
| Input validation | PASS — fixed target/context, inventory pagination/domains/owner checks, query/read/time/response bounds preserved; adversarial malformed cases reject |
| AuthZ | PASS — no new route, mutation or access bypass; main guards preserved, access false cannot authorize, all mutation/deploy/serviceConnect flags false |
| Injection/XSS | PASS — no SQL or product rendering change; ephemeral viewer uses textContent for result values, fixed local data only, restrictive CSP and loopback-only browser requests |
| Dependencies | PASS — no package/config/lockfile change or install; preexisting Playwright/Chromium used |
| Config | PASS — no CORS/prod/env weakening; owned credential-free homes and isolated ephemeral loopback only; no app/database startup |

Browser lifecycle serialized through `/tmp/clinicos-browser-qa.lock` for server startup, browser, assertions, screenshot/trace and teardown; `/usr/bin/chromium` with preinstalled Playwright. PLAYWRIGHT_BROWSERS_PATH set before import. Screenshot visually inspected and PNG CRC/all pixels decoded; trace ZIP CRC and all 11 text/resource entries scanned for forbidden synthetic values and fresh sentinel. Zero console/page/HTTP errors or external requests. Controls show 22 failures and 24 total; reload retains actual result values. Browser/context/server closed and port connection refused. Synthetic owned CLI directories removed. No video claimed or required for this internal nonproduct diagnostic.

Raw trace: private owned root `private-trace.zip`; never copied into the public packet. Safe screenshot, noncredential records and reproducible harness are public. The public manifest enforces files <=25MiB. Root alone handles immutable publication, actual native six checks, exact-SHA actual Claude review, fresh final Codex review and ordinary protected merge. Those gates and any first live schema/provider behavior are unverified by this QA and remain required.
