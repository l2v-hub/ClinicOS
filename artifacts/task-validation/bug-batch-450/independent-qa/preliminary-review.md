# Preliminary independent source review

This is read-only review of an author candidate that was still being finalized. It is not final source certification or a readiness verdict. No tests or browser execution were started during this review.

- Read all five GitHub issue bodies and comments. The owner-approved minimal scope for #450 overrides the original proposed redesign.
- Checked the seven authoritative frozen packet SHA256 values against root's durable group snapshot: all unchanged.
- Compared current tracked and untracked changes against the 47 authorized source paths plus this group's packet directory: no out-of-scope file.
- Reviewed the complete current application diff, new test files and canonical full-stack harness, plus the unchanged source cache, PDF asset plugin, document routes, review handoff, draft ownership/listing and confirm guards used by the changed flow.
- No certain application correctness defect or security blocker was found in this preliminary candidate. The final responsive source layout was still being finalized and must be reviewed and visually tested after root's stable-candidate signal.
- The canonical harness currently contains no internal flock. Root explicitly confirmed that one outer driver holds `/tmp/clinicos-browser-qa.lock` across the entire Docker startup → tests → browser → teardown lifecycle. Independent execution must use that single outer lock, without a nested lock.
- External OCR/extraction is an explicit local HTTP provider fixture. It returns no structured medication rows; the real backend parser recognizes the unheaded medication text. Upload, source hashing, page worker lifecycle, authenticated PDF bytes, review, database transactions and PDF.js/OpenJPEG remain real.
- No dependency/schema changes, production API URL/CORS weakening, TLS bypass, source authentication bypass or real patient fixture was introduced by the current diff. The source cache retains bounded bytes, aborts, immutable document ownership, revocation and URL cleanup. New list/resume UI uses the existing owner-filtered draft endpoints.
- Existing import review tests cover failed-source retry and byte limits. Existing intake-confirm tests exercise duplicate CF rejection; the canonical runtime exercises confirm replay idempotency. Both must actually run independently before being counted as proof.

Pending final phases: source freeze receipt; frontend full units/typecheck/build; import/parser/confirm and full historical proactive E2E regression on an owned PostgreSQL16 database; canonical full-stack browser evidence; visual inspection and security/evidence scan; final report with explicit executed/unexecuted counts.
