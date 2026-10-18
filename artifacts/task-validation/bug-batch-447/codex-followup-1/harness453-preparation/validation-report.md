# Combined453/486 harness preparation — root review

Final Decision: PARTIAL — PREPARED; E2E UNEXECUTED

The new harness preserves the original harness and all scenario bytes outside #453. Root reviewed the complete scenario and the v1-to-v2 correction. The original preparation and its missing blank-route/exact-new-row assertions remain recorded in the v1 evidence; v2 adds both checks and deterministic schedule ordering. No application source changed.

Source checkpoint before preparation: ccea0be90b906e71c3a32581097781e9623b6cef. Original harness SHA-256: f0cc1ef82e21761bfb104128c1087b5c7498442d509d06d44870baf26fbca50a. Prepared v1 SHA-256: da96ad3af26a98f600bc7d0782a58c77fd61e1e1d9626c95e190604194ac7dc0. Final prepared harness SHA-256: 971c8e507eaec83f7e44869bc661f59544601aff1030086f5000e4967ed58651.

Both counted flows first assert that the actual accessible route control is blank. The operator explicitly chooses the route. The known-negative flow contains four separate UI actions; the recorded-positive-allergy flow contains five, including warning confirmation. These are static counts in prepared code, not a measured passing browser result. No route is inferred from the pharmaceutical form and no product/allergen relationship is invented. Positive SQL readback requires exactly one newly created own patient/AIC row, exact dates, route and ordered schedules; the later retry/idempotence and context-invalidation assertions are retained.

Verification performed: trusted credential-free verification-mode node --check PASS, static preservation PASS, root diff review. The harness was not imported or executed. No browser, application, database or provider runtime was started for this preparation. Security review: no production source or authorization changes; scenario writes remain restricted to the existing isolated synthetic test fixtures when eventually executed. No new clinical screenshot or video is claimed.

Preparation reservation: a373b221-d645-4fee-a22c-3b2477229bea. Root follow-up reservation before v2: 411a81d2-dd0d-4b74-8fbe-4e5167d64fea. Both were persisted and read back before edits. The accepted plan amendment and task contract are included unchanged.

Remaining: actual Claude verdict and fresh final Codex review of parent483, separately reserved integration of that reviewed parent, author STOP and a fresh independent complete eight-issue browser/SQL QA against the resulting source. Existing continuation5 remains running and all historical attempts and evidence are retained. This preparation does not authorize a PR-ready label, issue closure, merge or deployment.
