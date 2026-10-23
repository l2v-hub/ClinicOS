# Independent QA contract — bug-batch-450

Reviewer: independent intake_450_qa2 session. Source baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6. All five live GitHub issues and their comments were read before execution. This addendum does not replace or change the frozen implementation packet.

## Authoritative acceptance

| Issue | Required result |
| --- | --- |
| #450 | Owner decision https://github.com/l2v-hub/ClinicOS/issues/450#issuecomment-6154947896 overrides the original two-screen/five-field proposal. Keep the complete one-page manual intake; combine document choices; automatic or empty sections stay incomplete; remove duplicate obvious help without losing errors, keyboard access, role gates or any full-form field. Real synthetic patient creation persists across reload, API and SQL. Desktop 1180×820, tablet 820×1180 and phone 390×844 choices remain usable without horizontal overflow. |
| #472 | Import uses available viewport. The original remains available during demographic and therapy editing at all three widths. Save/leave/resume preserves actual edited fields and source, with a visible resumable draft/incomplete identity and no duplicate patient. Required versus recommended fields remain clear. |
| #473 | Only a validated fiscal code proposes an absent sex, with visible provenance and operator control; explicit contradictory values survive. Unheaded medication lines go through the real parser into reviewable prescriptions retaining dose, schedule and source. Ambiguity cannot activate unsafe prescriptions or create administrations. The original remains visible during actual field editing and scroll. |
| #475 | Real authenticated multipage PDF, including a scanned JPX page, yields nonblank thumbnails and selected page canvas through actual PDF.js/OpenJPEG assets. Missing/unreadable originals have actionable error/retry; another operator and anonymous requests cannot access the source. Production and base-path resource behavior remains valid. |
| #476 | Name, surname and valid CF allow an incomplete imported draft/identity without invented birthdate. Supplied invalid CF/future birthdate, unsafe therapies and duplicate conflicts remain actionable blockers. The final confirmed patient has exactly one identity and persists after reload; repeated confirmation is idempotent. |

## Cycle 2 constraints

Frozen candidate source-freeze-47.json captured 2026-10-17T09:22:08Z; all 47 source paths and eight frozen packet documents must remain unchanged. Implementation 2/4; review 0/4. Independently verify the rejected unresolved close-save correction and unchanged uncertain network/503 handoff recovery. Full frontend suite, both typechecks/build, relevant backend integration, historical proactive23 including U denied ack, canonical19 real browser checks are mandatory. One global flock spans owned Docker startup, focused tests, proactive, full-stack browser and teardown. Never access development port5432. Exact pinned real fonts and synthetic provider fixture only. No source, Git or GitHub mutation.

Current issue bodies/comments read live, with #450 owner comment6154947896 authoritative. Raw dumps remain private outside repository; only read receipts are portable. QA1 remains immutable historical FAILED VALIDATION.
