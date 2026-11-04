# Source-bound validation — PR523 / issue522

Code source: 03529a96c3a37e4ffb4989497ca3db9fe32a9968; base: bc880a6dccc40d8dbad73c718c8aa4256562d254. Independent integrated Codex QA passed with report hash 8cd3c86523be83903b30a6152e9075a1a9fe51036dcb7c6306dbbe2be6e1ad50, findings empty. This is not Claude approval or live acceptance.

- Fresh integrated49 renewal and7 UI tests pass, no skips. Eleven changed source blobs match the independent manifest.
- Seven UI blobs equal b1d6d89c77ae1abe65a38d22e22c29b6a906f9bf, independently built and exercised in26 actual-App synthetic browser cases at1280/390. No real outbound or clinical writes. This is reuse by exact source equivalence, not a falsely claimed integrated rerun.
- Historical c104 frontend1586/1586 pass and18 browsercases pass; QA found a real late-simulator-expiry P2, preserved in history/qa1-report.md and fixed in b1.
- Operational checkpoints f4edbf24 / 1fee9e7b / 02bda58b preserve initial implementation, four actually failing race/transition tests, then the fix. Root integration equivalents018263e4 / 2ca25994 / 65eee06c remain in Git history.
- Baseline Windows-only existing harness failures remain: configure-demo-source106/108 and demo-deployment278/365. They reproduce on clean unchangedBC due existing URL/ESM CLI paths. No assertion was skipped, disabled or rewritten. Linux exact-head CI is still mandatory.
- Fixed-demo read-only preflight41494990323 succeeded atBC. No expiry mutation/deployment/clinical test was done.

This report is frozen BEFORE evidence-only publication. Exact final-head CI will be separately read and bound in canonical review context before requesting Claude. Do not confuse pending-at-writing with the eventual API-observed results. The immutable packet cannot include its own later CI without self-reference.

Pending gates: exact-head CI, genuine Claude Max review (new independent subject default4; PR520 grant6 untouched), final Codex, protected merge, one consumed typed human operation capability, fresh demo preflight, explicit single stage, separate exact-source deployment and live five-profile/login checks. Keep522 open until live proof.
