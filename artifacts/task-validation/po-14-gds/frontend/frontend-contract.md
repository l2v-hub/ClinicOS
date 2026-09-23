# PO14 GDS-15 frontend preparation

Preparation only. Root assigned this isolated checkout at baseline `6f8b7ded54084c4a380f94b61f9aa520b698a09c`; application code and tests await its explicit GO after PO13 is published and verified. Root owns browser, HTTP/PostgreSQL, rendered PDF inspection, integration and publication. No worker servers or ports are requested.

## Frozen inputs

- Root task contract snapshot: `a3b287c148561cccae5aa11cbe572f63400161d9f2aa57386d8393821c9e9abc`.
- Agreed backend DTO snapshot: `13ec80cedcc577c40e00e30a98a6e5f41ee03513c8a0a4afb6da13a252aba708`.
- Original PDF source: `f2d4494b49d96de08eceed69b1d793c45260f22aca7d62f98080ccee6133d709`.
- Extracted source text copied unchanged: `04c1c532ccc840ede01dcd042f0edc1d2ab9c8682900411ff8027f6911080610`.

The extracted text and original inventory were already verified by the source reviewer. This preparation does not claim an independent clinical validation.

## UI and wire contract

Patient navigation key is `gds`; its assessment type is explicitly mapped to `gds15`. Form version is `gds15-it-2026-09-22-v1`. The common workspace, history, document archive and navigation retain all existing published types and snapshots.

Render the fifteen original questions vertically in original order. Show the source instruction before the questions, including answers based on the last week. Every item offers explicit Sì/No choices in that order, initially unselected; no answer is inferred from other records. The points supplement each response, with the reverse scoring for q1/q5/q7/q11/q13. Track missing answers and completion without assigning a partial result or risk band.

Answers require q1..q15 boolean|null and optional notes normalized to an empty string. The notes limit is 4000 Unicode codepoints, with text retained during correction of invalid input. Reject invalid domains, missing question keys and unknown keys. Complete result is `{total,maximum:15,band,label}`, using the exact agreed bands and labels. Snapshot items preserve all fifteen frozen labels, boolean answers, scores and Sì/No descriptions, plus instruction, screeningNote, provenance and reference. Read the snapshot for finalized summaries; do not rebuild frozen text from runtime definitions.

Retain private drafts, session/patient/type separation, CAS, exact retries, preview invalidation on edits, explicit finalization, separate motivated correction, immutable predecessor and PDF archive recovery. Mapping from a GDS document must return to the `gds` patient tab and `gds15` assessment. The source warning is a screening limitation; no diagnosis, therapy or Cornell module is created.

## Implementation scope after GO

Anticipated new frontend files are a GDS types/definition/validation module, GDS form and snapshot summary, and focused domain/workflow/UI fixtures and tests. Shared changes are limited to the existing assessment type/version/definition/validation/draft/workspace/history/summary infrastructure, PatientDetail, tabGroups, App navigation, and typed patient document metadata/return navigation. Register exact paths in the implementation claim before writing them. Existing AssessmentWorkspace.css is protected; use its persistent patient identity and mobile behavior without reverting the PO12 fix.

Only this worker writes this checkout. Package manifests, lockfiles, backend, shared dependencies, protected launchers, commit, push, deploy and live patient writes are excluded. The dependency junction points to the existing quality-loop-20260829/node_modules and is read only by policy. TypeScript and Vite caches remain under the local frontend/node_modules directory.

## Planned validation after GO

Import production functions for all 32768 complete answer combinations, each reverse-scoring item, all Sì=10/all No=5, extrema 0/15 and thresholds5/6/9/10. Check each missing question, all-null, invalid booleans/numbers/strings/unknown keys, note limits and Unicode, and no complete result from partial answers. Bind source/DTO text parity to the agreed backend exports once frozen.

Focused workflow/UI tests cover draft resume, patient/type/session isolation and late callbacks, CAS/retry, preview and finalization guards, immutable snapshots/corrections, long notes, history validation and GDS document navigation. Run existing assessment, MNA, Tinetti, transfer, archive and navigation regressions once after the final candidate changes. Run production TypeScript/Vite build, baseline/candidate lint comparison, diff checks and a source/emitted-bundle secret signature scan.

Capture source state before final validations. Freeze source/runtime/artifact manifests and a receipt against exact source/build hashes; independently review, release claims and hand off. Root performs the browser/HTTP/PostgreSQL/PDF checks and publication. No application validation has run during preparation.
