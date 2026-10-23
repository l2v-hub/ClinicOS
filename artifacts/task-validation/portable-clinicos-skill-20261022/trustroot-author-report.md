# Author report — DOC-TRUST-ROOT-1 correction

Applied the narrowly scoped documentation correction in the new candidate only. The canonical merge-gate playbook now states the current trusted policy paths, the native current-head independent authorized human review requirement, the controller’s `ready-to-merge` / `humanReviewRequired` outcome, and the ordinary manual protected-merge requirement without admin bypass or allowlist override. The ClinicOS and Codex triage entrypoints point to that gate; the portable workflow document has a concise matching note.

The prior candidate and its QA artifacts were not modified. `bug-final-review/SKILL.md` is byte-identical to the previous candidate. The five-file candidate scope is exact. No Markdown tests or live/runtime operations were run; remaining independent QA is UNRUN. Native checks, Claude review, PR publication, merge, deploy, and closure remain pending.

Policy basis read-only: actual `review-policy.mjs` marks explicit trust-root files plus `.github/`, `agent-team/src/`, `scripts/quality-gate/`, `.agents/`, and `.claude/` as human-protected. The source and reserved contract state that this path requires native current-head approval by an independent authorized human and normal manual protected merge. The wording does not claim that model/static review, QA, a budget grant, or branch settings satisfy this requirement.

Static checks: five expected paths only; trust-root paragraph and entrypoint references are present; local relative Markdown link resolves; unchanged `bug-final-review` bytes confirmed. These checks do not replace independent QA.
