# Root accepted plan8

Plan SHA256 f1f869b94aae671867afbf8b8bc7f6255386d5cee1c344e8d6226c5371e0e02e, reservation a1c34605-ce9a-40d9-afc6-e3da114dc2ef. Root accepts the four-path design and grants author edits/tests ONLY for github.mjs and github.test.mjs in source8. Docs two paths delegated separately to Luna. All source7/evidence stays immutable.

Clarifications before implementation: reject symlink/submodule/directory ONLY for the target .codex-bug-state.json. Other legitimate root entries, including directories040000/tree, non-state symlinks120000/blob and gitlinks160000/commit, must remain valid and byte/hash/mode/type/path-identical; do not dereference or blanketreject them. Actual controlbranch root has50entries with many directories: use actual finite noop tree response as additional shape evidence, and meaningful fixture sentinel coverage. Regular blob100644/100755 preserved. Full root-tree validation must permit legitimate Git modes/types while rejecting malformed/duplicate/truncated entries.

Fresh owner hook and caller guard at final effect boundary plus validated exactref proof are required; validators are not authority grants. Large first creation must independently prove target absence without treating arbitrary404/auth as permission; no implicit ownership grant when hook exists/missing. Preserve strict callers and existing Contents behavior.

Nonforced GitData ref update protects ordinary concurrentforward writers under exactparent checks. Accepted explicit limitation: no absolute atomic protection against external force-rewind/ABA after final read, no claim that REST has expected-old-SHA parameter. No force/weakening/retry on unknown reference effects; no classification of every422asconflict.

Root actual noop GitData proof verified actualsameblob/tree/23subjects and force:false commit/reference/Gitreadback. That proves transport capability only, not exactContents400cause or source8module/clinical acceptance. Tests must prove functional boundaries. Preserve all causal first-failures, adaptation history and original assertions, no silent artifact overwrite. No network/live APIs/models by eitherauthor orLuna.

Author should implement/test whileLuna edits disjointdocs; do not freeze final138files untilroot confirmsLuna delivery and docs integrated. Root later reserves independentQA8.
