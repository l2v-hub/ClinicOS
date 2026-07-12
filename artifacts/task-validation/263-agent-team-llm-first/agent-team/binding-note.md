# Evidence binding note — issue #263, attempt 1

Three commit identities participate in the binding chain (a committed manifest cannot contain the
SHA of the commit that introduces it):

1. Implementation head `98e9251` — code state at which every unit/integration/doctor/build/syntax
   check in `validation-report.md` was executed.
2. Evidence commit `39b5e495f1dcf5d44e9e3dfb48ca05b060fc9d42` — commits all raw evidence files.
   The committed `artifact-manifest.json` and `development-handoff.json` in this directory use it
   as `subject_sha`, and every artifact entry carries the SHA-256 digest and git blob SHA as they
   exist at that commit.
3. Final PR head (the commit adding this directory's JSON files) — the published
   `development_handoff` protocol comment on issue #263 and PR #264 is regenerated against this
   head, so the comment's `subject_sha` equals the reviewed PR head SHA and its `artifact_refs`
   re-verify (identical blob SHAs and digests, since the evidence files are unchanged between the
   two commits).

Codex QA verification path: take the PR head SHA from the protocol comment, run
`verifyArtifactRefs({ repoRoot, subjectSha: <PR head>, refs: comment.artifact_refs })` — every
referenced file must exist, stay inside the repository, match its SHA-256 digest, and carry the
same `subject_sha` as the comment.
