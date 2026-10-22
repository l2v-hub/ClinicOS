# Author report — two documentation protocol corrections

Candidate 4 resolves only `DOC-RECOVERY-VERIFIER-2` and `DOC-FEEDBACK-SCOPE-3` in the two permitted documents. The Codex triage entrypoint now states that every `request --recover-failed` needs an injected trusted verifier, an `--authorization` reference, and consumption of the exact `retry-failed-review` action—even below the default review limit. It records that the standalone CLI has no default verifier, so the operation remains blocked without trusted host integration, and that recovery spends an available review without extending budget.

The triage and workflow docs now qualify readiness invalidation to feedback that changes the controller's authenticated feedback fingerprint. They state that only validated controller protocol/status metadata is excluded and user feedback or marker-like text is not ignored. This describes existing source behavior and introduces no user-defined or arbitrary filter.

The five-file candidate scope is exact; only `.agents/skills/codex-bug-triage/SKILL.md` and `docs/codex-bug-workflow.md` differ from the previous frozen candidate. The other three documents, including read-only `bug-final-review`, are byte-identical. Patch and per-file hashes are recorded.

Source basis read-only: `comment-review-handoff.mjs` invokes authorization for each recovery and consumes `retry-failed-review`; `operator-authorization.mjs` fails if trusted verifier/reference is absent and requires consumed provenance/binding; `review-handoff-cli.mjs` passes the optional authorization reference and injected verifier without configuring a default verifier; `github.mjs` excludes protocol comments only when author is the authenticated login or GitHub Actions bot and body includes the protocol marker.

No Markdown tests or live/runtime operations were run. This is `implemented-awaiting-independent-qa`; final QA remains UNRUN. Native checks, Claude review, human review, publication, merge, deployment, and closure remain pending. Earlier candidates and FAIL reports remain unchanged.
