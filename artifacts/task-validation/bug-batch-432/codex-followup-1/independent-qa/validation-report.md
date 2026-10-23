# FAILED VALIDATION — independent clinical QA for PR483 followup 1

**HIGH F1 — actual operator and admin agendas silently omit verification prescriptions.** Five ambiguous one-off prescriptions are present in SQL and the authorized typed feed, and visible in the week calendar. Both agendas display **0 of 5**, before and after reload. This fails AC4.

The root cause is `frontend/src/App.tsx:2028`: the clinical feed loads only for `terapie`. The real `AdminAgenda` mount at `App.tsx:3602` and `OperatorAgenda` mount at `App.tsx:3860` omit `therapySlots` and its lifecycle props. Consequently the new panels at `AdminAgenda.tsx:378` and `OperatorAgenda.tsx:400` receive undefined and render an empty group list. The same defect was first observed as a real browser failure in qa-5 and reproduced for both roles in qa-6.

Minimal correction scope: provide authorized read-only verification groups and correct date/loading/error/pagination lifecycle to the actual agenda mounts. Preserve UX447 dedicated timed-therapy navigation, existing ACL and read-only semantics; no new clinical mapping, dose, or administration action.

| Phase | Result | Evidence |
|---|---|---|
| Contract/scope | PASS | task-contract.md, scope-amendment-1.md |
| Source review | FAIL: F1 | source-security-review.md plus real browser result below |
| Builds/types/full suites | PASS | phase-origins.json, test-results/qa-4/ |
| Browser/SQL | FAIL: agendas; other executed cases pass | clinical-followup/results.json, independent-outcomes.json, evidence-map.json |
| Security/artifact integrity | PASS | integrity-and-cleanup.json, evidence-audit.json, image-text-audit.json |

**Actually executed independently:** backend 1,932 passed + five unchanged optional skips; frontend 1,396 passed, zero skips; fresh backend TypeScript/font build and frontend TypeScript/Vite build; migrations and import API; all seven canonical browser scenarios and real runtime/SQL assertions. qa-4 contains these actual runs. qa-5/qa-6 carry explicit own-qa-4 phase origins, never author proof reuse. The five skipped opt-ins are one archive PostgreSQL fixture and four issue428 role-directory fixtures; they are not reported as passes.

Dedicated clinical browser/SQL in qa-6 passed: explicit refused correction sends expectedStato=non_erogata, retains one record after reload, and replays one receipt; four ambiguous schedule classes stay null-clock/null-dose/read-only, normalized 08:30 is consistent, eight forged writes are 409 with no records, and calendar/giro/dashboard/visible Agnos/mobile checks pass. Independent adverse SQL/API passed five additional malformed/conflicting cases, limit-one pagination over six pages, exact count 5 with bounded sample 2, combined/empty ACL, ten denied writes, OSS 403, two different concurrent correction keys 200/409, one correction receipt, immutable replay and changed-payload denial. Week view and reauthentication/reload pass.

| Acceptance | Result |
|---|---|
| AC1 explicit correction/state/idempotency/ACL | PASS |
| AC2 typed read-only ambiguity without fabricated time/dose/action | PASS |
| AC3 clock normalization and periodic multidose preservation | PASS |
| AC4 all read consumers including actual agendas | **FAIL — F1** |
| AC5 seven original issue regressions | PASS — canonical 432/441/442/460/463/464/467 |
| AC6 preserve old proofs/source and avoid invented clinical mapping | PASS |

The scheduled branch of TherapyDrugDosePanel was compiled and covered by source/unit checks. Its existing product callsite mounts PRN; an additional QA-only shell could not execute because the shell omitted Vite's React refresh preamble. That extra direct-component browser check is **UNVERIFIED**, retained privately, and is not a second product finding or a pass.

Source binding: HEAD 34c865233df53a3930f29c8b7befc02208588d64 plus 41 frozen application/test files; changed digest 333b7c06f4d16e1ba54f857f594093008758e2a2165c3962a623e82f9d6a57f0. Full 4,736-input digest 9bea28c5e24825a6da9217a16fee7a8131a511c74f5c4989c63525b81ecc3851. All three executed snapshots and original inputs were rehashed unchanged; all 7,119 prior proofs retain their original bytes. Source-input-manifest.json and integrity-and-cleanup.json bind the evidence.

No source or GitHub state edits, commit, push, merge, closure, production data or paid provider call. Owned runtime/database removed; shared lock released; baseline clinicos-postgres remains healthy. Root must correct F1 in a new authorized continuation and request fresh independent QA before readiness. **FAILED VALIDATION.**

Artifact audit: nine ZIPs / 1,950 members CRC-checked; eight videos fully decoded; 1,562 raster image occurrences decoded; 943 unique images OCR-scanned. Nineteen standalone PNGs and 24 sampled video frames visually inspected. No credential findings. All published files are below 25MiB; final-seal.json records the final count and manifest.
