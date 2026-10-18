# Independent QA6 — maintenance470

Verdict: **READY FOR CODEX QA** for source `a9377cf2f2e66e42de246a604ce902496e4358da`. **QA SOURCE/HARNESS/PROOF STOP.** Remote/provider behavior and issue closure remain unverified. No product fixes, commits, GitHub/provider requests, credentials, database access or deployments were performed.

## Scope and results

Contract followup2 SHA `b0e5ae6d9e26e559a8626c495c0cf243bca59cee038e7e33f540153a06e099df`, original followup1 and append-only amendment were reviewed alongside repository CLAUDE and qa-gate skill. Source review confirms only the two permitted workflow/test changes since 5bab. The original-job suffix, wrapper and imported helper checks remain passing and byte-identical. Dedicated readonly concurrency remains distinct from deployment concurrency, all prior job operation guards remain unchanged, credentials occur only after the mandatory tests and CLI installation, and reviewed SHA/branch/environment/provenance boundaries remain enforced.

| Phase | Result | Evidence |
|---|---|---|
| Contract and diff | PASS | source-diff.json; source-before.json; author input match |
| Full independent tests | 115 pass / 0 fail / 0 skipped/cancelled | full-tests.json |
| Exact committed actual cone sparse checkout | 115 pass / 0 fail / 0 skipped/cancelled | checkout.json; sparse-head.json; sparse-status.json; sparse-patterns.txt; sparse-tests.json |
| Additional independent checks | 18 recorded checks pass | independent.mjs; independent-results.json |
| QA-only browser surface | PASS: 2 controls, 2 reloads, receipt values, no console/page/HTTP errors | browser-results.json; inspected.png; blocked-reload.png |
| Security | PASS within offline scope | actual helper guards, input allowlists, redaction, finite causes and old-job safeguards |
| Preservation | PASS | final-integrity.json |

Fresh shared local clone checked out the exact candidate SHA with cone paths `scripts/maintenance` and `.github/workflows`. No source overlay was applied. Its status was clean; all five relevant source hashes matched, and frontend/backend/proof directories were absent. Both runs used trusted createRunner verification with PATH-only input and isolated home, without credentials. No package installation or unrelated application full suite was needed for the two-file workflow packaging fix.

Independent scenarios reused the candidate's synthetic baseline fixture data only; QA authored additional assertions and transport mutations externally. They exercised actual unchanged inspectStorageBinding through candidate wrapper, stable nonzero snapshot counts and two complete observations, second-observation private config drift, snapshot drift, final branch drift, four illegal argv forms, three illegal native-query sequences, distinct HTTP/JSON/timeout causes, forged receipt rejection and dedicated concurrency. No production/test code was monkeypatched or altered.

Security review: no new routes, auth bypass, dependencies, clinical data, SQL, PHI, production configuration or application logging changes. Synthetic private configuration and token sentinels are excluded from receipts/evidence; receipt serialization requires actual internal provenance. Public values are bounded operational metadata and explicit false cleanup/deletion/redeploy flags. No live transport was invoked.

The browser was serialized using `/tmp/clinicos-browser-qa.lock` for the entire lifecycle. Its loopback-only QA surface shows **actual fresh mocked candidate receipts**, explicitly labeled as synthetic, not the clinical app and not a live provider. It validates inspected receipt values (one snapshot, two observations, no cleanup), switches to blocked private-drift receipt, reloads and retains the selected result, then switches/reloads success. Both PNGs decode successfully. Private trace CRC/JSON decoding and sensitive sentinel scan pass. Video was not configured. Owned server/browser/sparse clone/verification home were removed; baseline fixtures were untouched.

## Preserved failures and verification limits

Previous QA5 remains FAILED VALIDATION at ce7: full115pass, actual old sparse114pass/1ENOENT; Git proof5bab and all historical attempts are preserved. All 5,998 files (1,153,830,954 bytes) match the immutable previously recorded manifest SHA `7bac65b587b771566c790ca030ddfb7cafd74e70aee4e5972207785741edfc85`. Timing detail: initial pre-execution check used original 5,931-entry manifest; complete 5,998-entry check occurred twice at final integrity, so these checks are not represented as a fresh complete pre-test scan. Existing immutable manifest supplies the earlier expected hashes. Original author5 19/19, QA5 7/7, author6 26/26 sealed files and all eight author input entries match.

One QA harness-only summary assertion failed because it expected TAP `# tests` while Node's terminal reporter emits `ℹ tests`. Both retained fresh executions had already exited0 with115pass. `verify.mjs` preserves that original incorrect parser; independent.mjs readback accepts both documented reporter prefixes and validates all counts without rerunning tests or changing product. This was not a product failure and did not conceal/remove any failed test.

No provider diagnosis, storage cleanup, remote CI, actual Claude review or final root Codex gate is certified here. Root owns publication/state and next exact-SHA review. Never merge historical maintenance branch into main or repeat historical SQL cleanup.
