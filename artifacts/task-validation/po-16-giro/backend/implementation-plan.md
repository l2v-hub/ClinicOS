# PO16 backend implementation plan — awaiting root GO

Scope: MNA PDF presentation only. Root owns integrated usability QA and publication; frontend owns UI wording/history and touch targets. This worker is the only writer in `po16-mna-backend`.

1. After explicit GO, acquire the application claim for the exact source paths, preserve the preparation inputs, and record the root release evidence. Expected files: `mna-pdf-content.ts`, `pdf-renderer.ts`, the existing `mna-pdf-db.test.ts`, and focused presentation/legacy-ready regression test files under `backend/src/assessments/__tests__`.
2. Add singular/plural rendering to MNA item score text and use the frontend BMI display semantics exactly. Keep the existing decimal-comma score formatter for the total and cover 27.5 → 27,5. No change to clinical calculations or snapshot construction/hashing.
3. Bump only the MNA branch of `assessmentRendererVersion` to `mna-a4-v2`. The existing renderer Producer and document creation sourceManifest derive from that selector. Do not rewrite old manifests or change the ready short-circuit.
4. Restore the real synthetic v1 assessment/document from the frozen PO15 state/PDF into a fresh native PostgreSQL loopback database. Seed the matching patient/operator with the existing parameter fixture. Insert the historical record with its original snapshot/digest and document bytes. Capture exact persisted rows and PDF metadata before retry; invoke the real retry service with a renderer spy; require zero calls, unchanged rows/document count/bytes/hash/manifest/snapshot and Producer v1 afterward. Preserve source records as evidence; do not generate a fake v1 using the new renderer. Verify database timestamp parsing when restoring the exported record, without rewriting the snapshot.
5. Finalize a new MNA record with measured 64 kg / 160 cm and a half-point total. Verify raw BMI and snapshot hash remain unchanged while displayed BMI is 25 and total uses comma; new archived Producer/sourceManifest are v2. Include boundary-adjacent values on both sides of 19/21/23, raw fallback for positive values rounded to zero, and incomplete/null cases. Compare display directly against unchanged frontend `displayMnaBmi` for representative values.
6. Run focused MNA, SQL and PDF lifecycle tests; regressions of the other assessment modules. Use the PO15 runner with explicit artifact export directories, avoiding empty paths that resolve to the worktree root. Bind every run to exact input hashes and close every synthetic database. No external patient writes.
7. Build/typecheck/schema/fonts/diff validation. Render the changed MNA outputs with Poppler and inspect every page; assert other module versions unchanged. Preserve failed attempts if any, and record source/test/renderer/PDF hashes in an explicit artifact allowlist.
8. Freeze the source, release the source claim for root integration, and request independent source/artifact review. Root completes HTTP/browser and release. The worker does not commit, push, deploy or delete worktrees.

## Preparation result

1103 source inputs stayed unchanged while a byte-verified private Prisma client was copied from PO15. Shared dependencies are read-only. The root's existing synthetic v1 PDF and source state were copied exactly; the PDF snapshot digest and document hash agree. Three baseline pages were inspected. No application tests, database connections, candidate PDF generation or source edits occurred during preparation.

## Validation limits

The existing v1 sample uses declared BMI category and total 30; it proves preservation, not the new measured-BMI or half-point presentation. Those need a new synthetic v2 sample after GO. This work does not claim clinical validation, physical-device testing, production performance or a dependency CVE scan.
