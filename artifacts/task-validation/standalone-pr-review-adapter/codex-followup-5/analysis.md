# Actual third-review analysis

Subject: PR492 at ded0c92c95362c25bd8b7c07aa191ce9f1bae470; actual review comment6256012226. This continuation preserves all eight previous implementation attempts and their original outcomes. It does not replace the actual review with fixture results.

R1 required durable operation metadata so projection recovery cannot authorize arbitrary mutation retries. Definite merge rejection can end a reservation only after native OPEN/exact-head verification and another guarded CAS; uncertainty retains the reservation. Revision adoption must archive the full merging reservation after verifying a different open head.

R2 is resolved with explicit-only request notice repair. Background waiting reconciliation makes no notice or actor calls. Independent label projection keeps its own safe retry policy.

R3 uses the exact root-pinned budgetAuthorizationCutover schema. Missing marker means an empty legacy prefix. All collections validate scope-bound receipts after that prefix; existing records are not normalized. Adoption cannot supply grants or mint legacy exemptions. Stored receipts do not authenticate an external grant, and the shipped CLI still has no live verifier.

R4 shares a wall-clock retry helper between tick and standalone finalize: 1/2/4/8/16/30-minute delays and a minimum 30-minute failure window. Failed persistence aborts the whole tick. R5 uses a 330-second lease covering a bounded 300-second preparation window plus a 30-second command, with a final deadline check before command start.

R6 protects the runbook and model/executor trust tests. This empties the current production automatic infrastructure list; no new file is preauthorized. Production CLI tests now expect verified QA followed by a manual protected merge. Explicit harmless synthetic scopes exercise core merge mechanics.

R7 decision: merge496 FIRST as the minimal bootstrap, then integrate/rebase492. Retain one pinned loader, the 8MiB state limit and 16MiB transport limit. Root alone writes refs. No current main-integration, hosted Node22, native human approval, deployment or live provider claim is made here.
