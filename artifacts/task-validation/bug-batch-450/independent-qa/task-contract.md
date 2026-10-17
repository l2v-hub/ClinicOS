# Independent QA contract — bug-batch-450

Reviewer: independent intake_450_qa session. Source baseline: a516d42e31f6674c39c1d130c9706cd80a7ab4c6. All five live GitHub issues and their comments were read before execution. This addendum does not replace or change the frozen implementation packet.

## Authoritative acceptance

| Issue | Required result |
| --- | --- |
| #450 | Owner decision https://github.com/l2v-hub/ClinicOS/issues/450#issuecomment-6154947896 overrides the original two-screen/five-field proposal. Keep the complete one-page manual intake; combine document choices; automatic or empty sections stay incomplete; remove duplicate obvious help without losing errors, keyboard access, role gates or any full-form field. Real synthetic patient creation persists across reload, API and SQL. Desktop 1180×820, tablet 820×1180 and phone 390×844 choices remain usable without horizontal overflow. |
| #472 | Import uses available viewport. The original remains available during demographic and therapy editing at all three widths. Save/leave/resume preserves actual edited fields and source, with a visible resumable draft/incomplete identity and no duplicate patient. Required versus recommended fields remain clear. |
| #473 | Only a validated fiscal code proposes an absent sex, with visible provenance and operator control; explicit contradictory values survive. Unheaded medication lines go through the real parser into reviewable prescriptions retaining dose, schedule and source. Ambiguity cannot activate unsafe prescriptions or create administrations. The original remains visible during actual field editing and scroll. |
| #475 | Real authenticated multipage PDF, including a scanned JPX page, yields nonblank thumbnails and selected page canvas through actual PDF.js/OpenJPEG assets. Missing/unreadable originals have actionable error/retry; another operator and anonymous requests cannot access the source. Production and base-path resource behavior remains valid. |
| #476 | Name, surname and valid CF allow an incomplete imported draft/identity without invented birthdate. Supplied invalid CF/future birthdate, unsafe therapies and duplicate conflicts remain actionable blockers. The final confirmed patient has exactly one identity and persists after reload; repeated confirmation is idempotent. |

## Execution and evidence constraints

The initial work is read-only contract/diff review until root sends ROOTSTABLEGO. Source hashes must be refreshed after that signal, and all independent commands must operate on that immutable candidate. There are 47 authorized source paths and three explicit scope amendments; all seven frozen packet hashes were checked unchanged during preliminary review. Implementation attempt 1 remains running; no budget reset or publication is authorized for this reviewer.

After the stability signal: independently run frontend typecheck/build/full unit suite, backend relevant tests plus the historical proactive denial regression using an owned PostgreSQL16 test database, and the canonical full-stack Playwright harness. The whole database startup → tests → browser → teardown must hold `/tmp/clinicos-browser-qa.lock` once. Never touch the development database on port 5432. Use synthetic fixtures only, retain genuine fonts and PDF bytes with checksum/TLS validation, and explicitly describe the external OCR/extraction provider fixture. No paid inference, production data, source edits, GitHub mutations, commit, push, Claude invocation or deployment.

Evidence must include actual assertions and persisted values, zero unexpected browser errors/relevant HTTP failures, result PNGs, real trace ZIP and WebM, a report and raw test results under this independent QA directory. Synthetic simulator tokens must be redacted from portable traces without removing requests, snapshots or results. Original author evidence remains historical and cannot certify this independent run.

## Current status

Phase 0 complete. Preliminary source review in progress. Phases 2–4 have not run; no readiness verdict has been issued.
