# PR495 continuation2 independent QA

Verdict: READY FOR CODEX QA. QA source/harness/proof STOP.

Scope: exact source commit c1f11fa77945ce8cc57d1948ef0bfa8736954d63, actual Claude review6254585844 F1/F2/F3 and continuation contract SHA256 07cb554af17678afd64b892fba44501557ee5b4c79ef8bc728d4e9310535aaa7. Dedicated independent QA after author STOP; reservation nonce25a533af-d055-4d6b-8063-6e269bb5d9fa. Read-only source, no GitHub/provider/credential/DB operations, no commits or remote writes.

| Phase | Outcome | Evidence |
|---|---|---|
| Contract | PASS | contract hash and exact source inputs in before.json |
| Diff review | PASS | only workflow, bearer module, bearer tests changed versus 702c46779dc3212c2f1938746b482743aca7da64; concurrency dedicated, finite trusted errors, explicit public metadata policy |
| Fresh candidate tests | PASS 122, fail0, skip0 | candidate.tap, candidate-result.json |
| Fresh topology tests | PASS 20, fail0, skip0 | topology.tap, topology-result.json |
| Independent negatives | PASS 12, fail0, skip0 | independent.tap, fresh.test.mjs |
| Browser QA-only surface | PASS | public/qa-result.png, browser-result.json, private/trace.zip |
| Security | PASS within mocked offline scope | security-cleanup-check.json |

154 fresh passing tests total. Independent checks cover forged/cloned/proxy receipt rejection; unknown provider keys and identity discarded; exact token reflection blocked; second-snapshot repository drift; duplicate domains and foreign environment fail closed; pre-read length bounds; poisoned body-read error constant; false access inventory suppression; HTTP403, invalid status600, GraphQL poisoned message/extensions, DOM TimeoutError and network exception distinct finite codes. Fresh candidate tests additionally cover actual CLI finite stderr and exact whitelisted output fieldsets. No hosted bearer/schema/production execution claim.

Browser is an owned ephemeral loopback QA-only receipt viewer of ACTUAL fresh TAP/result files, not clinical product E2E. It asserts actual result counts and all five negative cause codes, exercises reload control and page reload, records zero console/page/HTTP errors, screenshot and trace. Lifecycle serialized with flock /tmp/clinicos-browser-qa.lock; Chromium executable /usr/bin/chromium and approved existing Playwright import. Successful browser child uses trusted createRunner verification environment, as do all test suites. Trace stays private; screenshot visually inspected, contains synthetic aggregate counts/codes only (minor middle-dot encoding artifact in QA heading). Public files limited by explicit public-manifest.json, each below25MiB. PNG chunk CRCs and trace ZIP CRC verified; screenshot successfully decoded for inspection. Trace text/resources scanned for synthetic token/private sentinel, Authorization/Bearer, token patterns and patientName: none. No real PHI or secret data supplied. Browser and own server closed; owned port refusal independently confirmed. No shared app/DB touched.

Security diff review: only fixed queries and variables, exact provider URL, redirect rejection, request/response/time bounds, response status validation, no arbitrary error reflection or auth fallback. HTTP status validated integer100..599; no permission/credential inference from generic failures. Intentional whitelisted public operational metadata accepted by task contract; raw identity/provider errors/config values excluded. No dependencies/endpoints/schema/AuthZ/app changes. Existing production workflow untouched and concurrency distinct. All 24 prior proof files match their original manifest; source inputs match author freeze and remain byte-for-byte unchanged before/after. before.json contains source, helper, contract/review and old-proof hashes; after.json identical. No unrelated frontend/backend suite required for these standalone scripts.

Retained failed setup attempts: attempt1-run.mjs + attempt1-spawn-result.json record absent /usr/bin/node (no test executed), corrected own harness to process.execPath. attempt1-browser.mjs + attempt1-browser-result.json record unavailable Playwright ffmpeg binary and confirmed cleanup; optional video omitted in successful screenshot/trace run. These are harness/environment attempts, no product failure or assertion failure; no candidate source fixed. Raw trace remains private, no video claimed. Existing first QA and author proofs untouched.

No environment configuration changes needed. Sole root controls GitHub/state/provider publication. This verdict permits further review; does not authorize merge/deploy or attest live credential access. All proof/harness inputs sealed in seal.json; no further modifications after this STOP.
