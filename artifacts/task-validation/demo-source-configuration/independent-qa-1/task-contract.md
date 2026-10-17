# Independent QA contract — demo source configuration attempt 1

Authority: frozen `../operational-contract.md` (SHA-256 aa77b5a65e51d6c79a6c14b8a208d01e85c2e5dcbdefdec9b704ca55ae6d1559), user-authorized automation setup and the exact operational task assigned to this new dedicated QA session. Related issue #470 and both current comments were read; only URL/comment references and a private-read digest are published in `test-results/issue-read-receipt.json`. This operational branch configuration is separate from the exhausted maintenance and guard budgets and cannot certify or close #470.

Base: b7194ac4dd185b3edc4f8d093c0505d0b4ef69ea. Exactly three source files from `../candidate-seal.json` are reviewed. No application, database, existing guard or existing evidence may be modified. QA creates files only here.

Acceptance:

1. Manual-only, exact repository/main/reviewed-SHA workflow; pinned actions, protected demo environment, one demo token only on the execution step; tests run without credentials. Inspect is the default.
2. Fixed HTTPS endpoint, no redirect, bounded 256 KiB body and 30 second timeout. Exact project, environment name/ID, service, repository, domain and existing GitHub trigger binding are validated. Projected artifacts contain only bounded allowlisted metadata, never provider errors, variables or headers.
3. Read-only inspect cannot mutate. Branch update requires an exact inspected SHA-256 digest and fresh unchanged metadata; no-op uses zero writes. Missing, duplicate, foreign, stale or malformed bindings block writes.
4. The sole mutation updates the existing trigger's branch to main. It cannot create/delete/reconnect/deploy/edit variables. Exactly one mutation at most, no automatic retries or rollback. A fresh after-read must match all previous projected metadata except the branch. Concurrent metadata drift blocks success; the provider has no CAS primitive, so this is detection rather than an atomic concurrency guarantee.
5. Existing 57 tests and new independent adversarial probes pass. Both GraphQL documents validate against the cached official Railway CLI 5.66.0 schema; both JS ASTs and the workflow YAML parse and enforce the trust envelope.
6. Safe internal browser surface calls the actual module and actual HTTP client adapter against an owned synthetic loopback provider only. Assert concrete results, read/write counts, preservation of root/check policy/override, persistence after reload, expected rejection diagnostics, and no browser console or HTTP errors. Publish a result screenshot, trace, video, machine report and HTML report. Browser runs under the shared global flock.
7. Scan the complete owned packet and ZIP contents for credentials, real clinical data, unsafe artifacts, oversized files and symlinks. Final source, contract and previously sealed evidence hashes must remain identical. No provider/GitHub write, secret access, model call, push, PR, merge or deployment is performed by QA.

Validation is local on Node 24.19.0; the workflow pins Node 22. No actual Railway outcome or Node 22 native success is inferred from local synthetic tests. Frontend compilation is outside this three-file operational scope; its equivalent executable/build checks are JS syntax, AST, actual module loading, YAML and official GraphQL schema validation. No frontend dependencies are installed or application files touched.
