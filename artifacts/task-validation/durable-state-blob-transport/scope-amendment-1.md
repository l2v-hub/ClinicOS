# Amendment1 — real GitHub metadata in shared handoff fixtures

New strict state transport exposes twelve failures in comment-review-handoff.test.mjs because synthetic Contents responses omit actual size/encoding/GitBlobSHA fields. Add exactly agent-team/tests/bug-pipeline/comment-review-handoff.test.mjs to allowed paths solely to supply truthful Contents/blob fixture metadata and retain existing behavioral assertions. No production handoff change, no test skips/weakened assertions. Broad suite retains two unrelated source-lock failures in unit tests; reproduce/compare baseline exact unchanged inputs before classifying them as pre-existing. Those two unit paths and their application sources are outside scope.

All original contract, two-source behavior and integrity/CAS constraints remain. Author must wait durable root readback before new fixture edits.
