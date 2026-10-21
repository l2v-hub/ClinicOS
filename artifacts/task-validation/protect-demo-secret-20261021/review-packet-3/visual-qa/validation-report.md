# Independent synthetic helper visual QA — #499

Final Decision: **READY FOR CODEX QA** for this independent visual evidence scope. Source `34996816c9b8149a4a90f9ccfc7eabec230d2828` is unchanged. This is a synthetic helper QA report, not a live secret migration or a full re-run of native tests.

The HTML was generated from six actual calls to the shipped `main(env, dependencies)` across four asserted scenarios. The fixture passes an in-memory fake GitHub API and the actual `writeEnvironmentSecretWithGh` with a fake in-memory command runner. The browser reads only the resulting metadata/counts; no token/secret values, their hashes or fingerprints are stored or displayed. Global fetch was disabled during generation. No real GitHub requests, gh writer processes, credentials, providers, database, application server or native suite runs were used.

| Criterion | Actual observed result | Decision |
| --- | --- | --- |
| Repo-only ensure and independently fresh delete | Ensure writes once and retains repo. Separate stale-main removal fails `FRESH_MAIN_SHA_MISMATCH` with no delete. New fresh invocation verifies environment/admin/main/inventories and deletes once, retaining environment. | PASS |
| Existing environment avoids overwrite | Actual main receipt is `already-present`, environment writer calls0, repo retained. | PASS |
| Version process failure stops writer | Actual writer gate returns `GH_VERSION_CHECK_FAILED`; actual main returns safe `ENVIRONMENT_WRITE_UNCERTAIN`; synthetic version checks1, secret-set commands0, deletes0, repo retained. | PASS |
| Non-main rejects before API | Actual main returns `TRUSTED_MAIN_CONTEXT_REQUIRED`; API dependency reads0, API calls0, writer/version calls0. | PASS |
| Browser result and reload persistence | Official PlaywrightTest:1 passed, all four cards visible and exact values asserted before and after reload; card text identical after reload. | PASS |
| Browser safety | Console errors0, page errors0, relevant HTTP errors0, unexpected network requests0. Exactly2 owned loopback page reads, both200. | PASS |
| Preservation and cleanup | Four source files, Git index,118 original public/private proof files and sealed failed first attempt unchanged. Browser and static server closed, port5499 released and common flock released. | PASS |

Actual evidence:

- [Final screenshot](browser-attempt2/screenshots/helper-results.png)
- [Trace](browser-attempt2/trace/trace.zip)
- [Video](browser-attempt2/video/helper-results.webm)
- [Official Playwright HTML report](browser-attempt2/playwright-report/index.html)
- [Raw official results](browser-attempt2/playwright-results.json)
- [Browser observed values](browser-attempt2/browser-observed.json)
- [Actual helper outcomes](helper-outcomes.json)
- [Owned server request log](browser-attempt2/static-requests.json)
- [Command receipt](browser-launch-receipt2.json)
- [Resource handback](resource-handback2.json)
- [Source/proof freeze comparison](freeze-comparison.json)

The screenshot was visually inspected: all four result cards and explicit “Synthetic helper QA / No migration performed” labels are visible, with the exact source SHA. It contains metadata only.

History and grants:

- Preparation contract was written before browser reservation. Trusted skills were read via Git show from main `fbaa78d8c7eacf8402db0c8fa2be276ae579a27c`: [playwright-evidence](trusted-skills/playwright-evidence/SKILL.md), [qa-gate](trusted-skills/qa-gate/SKILL.md), and its referenced [parallel-evidence-remediation](trusted-skills/parallel-evidence-remediation/SKILL.md). Root's narrower scope retains all publication/native QA authority.
- Attempt1, nonce `a7dd0a46-2153-460a-b915-3d53e274adc9`, state `fae09286088cc90fe49dd524857f262e566de495`: actual file:// navigation failed with `ERR_BLOCKED_BY_ADMINISTRATOR` before page assertions. Failed screenshot/video/trace/report are preserved byte-exact under `browser-attempt1`, seal `bda6973f48a4e9bf6114aca5608e67bbc40b39eb48164a43c8108c969cd0a25c`. No policy change or retry under that grant occurred.
- Root then explicitly granted attempt2 with nonce `3792204d-9713-4e16-9319-36e705861752`, canonical state `b1b2d9ab14f46fac239b3925ef212f65b3206f07`, readback verified. One static server bound only `127.0.0.1:5499` and served the exact frozen HTML SHA256 `51339d8b9ab05c7e4859f175b24f8af1d322c9236e275590029306cf81dcf3de`, GET/HEAD only, no directory/application routes, safe204favicon. Browser policies remained untouched. The full browser/server lifetime was held under nonblocking `/tmp/clinicos-browser-qa.lock`.
- Trusted createRunner used verification mode, PATH-only parent environment and private runtime directories. Browser worker stripped token/secret/database/proxy variables and used existing `/usr/bin/chromium` plus existing ffmpeg cache. No download or install.
- The real pinned gh2.103.0 checksum/version evidence is separately root-owned and attributed in `pre-browser-manifest.json`; this QA did not execute the real binary or its secret operations and makes no crypto/live-migration claim. The38 native tests were not rerun; root independently owns native6 and review2 gates.

STOP. Root is sole publisher and final QA gatekeeper. No Git/index/ref/GitHub/canonical/provider/publication changes were made by this reviewer.
