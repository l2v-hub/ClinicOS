# Implementation and review plan

1. Keep the correction within the three scoped writer/test files and reuse the existing outcome priority helper.
2. Verify transaction-double regressions, the complete affected HTTP/PostgreSQL file, backend types and a private frontend build against the clean `e405399427e7c738dc32070b17a50494b629608b` checkout.
3. Verify actual rendered valid/repaired legacy outcomes and reload persistence. Exercise stale and omitted-state requests as HTTP denials with complete SQL/receipt snapshots held privately. Exercise explicit refusal corrections through authenticated HTTP after observing the rendered refusal; do not describe this as a UI correction-button flow.
4. Preserve prior approval, prior failed final review, prior QA failures, and unrun gates with their original identities. Root then performs native publication checks, actual Claude5 and fresh final Codex.

No closure, merge, deployment, or overall release claim is part of this candidate.
