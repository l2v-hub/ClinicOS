# Implementation and validation plan

1. Keep production changes inside the already fingerprinted native-guard-session.mjs and native-guard-container.mjs; do not alter qualification, provider fallback, workflow, target or authorization policy. Container scope was explicitly extended after independent review confirmed its pre-existing removeOwned method silently resolved on failed or unknown Docker removal, preventing a genuine positive cleanup proof.
2. Keep a referenced operation deadline while startup, policy, isolation or release are pending. Use a shared cancellation signal so closing or invalidation settles every outstanding gate.
3. Invalidate authority synchronously before cleanup. Memoize cleanup work and its bounded, sanitized result for all concurrent callers. A cleanup timeout means an unknown resource outcome and cannot create retry or release authority.
4. Attempt cleanup of owned proxy and container independently so one stuck transport cannot prevent the other stop attempt. Remove only the invocation's own private directory and only when cleanup is known safe. Keep unknown resources distinguishable from successful removal.
5. Close a runtime returned after cancellation without restoring session authority. Preserve ownership checks, no Docker prune or broad path removal.
6. Add real child-process regressions without internal watchdogs for pending startup, pending cleanup, cancellation during isolation and release. Cover concurrent close and late startup; preserve native guard regression expectations.
7. Run native tests, syntax, format and diff checks. Record platform-specific skips accurately. Submit the exact repair source for independent source review and hosted CI; do not treat either as live native qualification.
8. Keep the repair unmerged until the repository's actual independent native human approval and protected release prerequisites exist. Then separately reconcile the failed native run before any explicitly authorized new-source qualification; no blind rerun or consumed-budget reset.

Ownership: source_inventory is the sole code/test writer in C:/w-rv/native-review-liveness-20261105; root owns this packet and integration. infra_inventory performs read-only independent source review. The original user checkout and clean trusted M checkout remain untouched.
