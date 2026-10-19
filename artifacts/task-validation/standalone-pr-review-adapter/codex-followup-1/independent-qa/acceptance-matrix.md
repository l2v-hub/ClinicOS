# Acceptance criteria → independent evidence

All referenced tests executed in independent-negative-cases.tap:17PASS,0FAIL,0SKIP. Existing relevant suite full-suite.tap:714total,711PASS,0FAIL,3Windows-onlySKIP. Browser artifacts and full actual-state result are listed in validation-report.md.

| Criterion | Result | Evidence | Concrete assertion |
| --- | --- | --- | --- |
| F1 | PASS | independent-negative-cases.mjs tests1,15; browser trust-root receipt | Five caller-expanded protected paths never reach merge; native stale/dismissed/Bot/self/excluded/unprotected approval rejected. |
| F2 | PASS | tests2,14; actual-state-local-validation.json; full-state-local-validation.json | Manual/normal PR, branch and issue overlaps reject; actual491packet and passed continuation use local Git bytes; shortened/changed legacy prefix or missing proof rejects. Full actual post-migration state passed; both archived tombstones retain exact canonical historical prefixes and reinserting either rejects ownership. |
| F3 | PASS | tests3,15 | Same actor/reviewer/author cannot merge without real independent native human approval and review protection; guard-time revocation prevents merge. |
| F4 | PASS | tests4,5,6,11; browser recovery audit | Wrong nonce/nonmaintainer/replay/stale submit reject; consumed review retained after head drift; stale QA worker cannot overwrite recovered state with real CAS; merge release requires open unmerged subject. |
| F5 | PASS | tests7,8,16; browser durable projection receipt | Three idempotent label attempts then persisted=true,reconcile; reconcile adds no round/comment; confirmed409 vs definite502 vs uncertain timeout distinct; uncertain server persistence recovered by read without duplicate write. |
| F6 | PASS | test9 | App provider credential is absent from model child; existing .codex retained; missing auth or explicit CODEX_API_KEY conflict blocks. |
| F7 | PASS | tests10,11 | Each pinned packet file read once across submit/import/projection; next operation rereads and rejects changed digest; changed head rejects; failed standalone write reloads before unrelated normal queue save. |
| F8 | PASS | test12 | Exact optional Vercel only; similar-name unknown failure, empty required inventory and required Vercel failure block. |
| F9 | PASS | test13 | Fixed injected timestamp is durably visible before independent callback. |
| Audited continuation | PASS | tests14,17; actual-state-local-validation.json | Original default4 and actualmanualspent5 retained. Maintainer-only one-step allowance binds history; manifest grant/changed history reject; new round6 omits old terminal proof and approval fields. |
