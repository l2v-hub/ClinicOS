# Issue tracker: GitHub

ClinicOS tracks issues and specifications in **l2v-hub/ClinicOS** on GitHub.
Codex and Claude use this same configuration. Use the existing authenticated `gh`
CLI and specify `--repo l2v-hub/ClinicOS` for issue/PR commands. Never request or
copy credentials as part of a skill invocation.

## Read and publish

- Read an issue: `gh issue view NUMBER --repo l2v-hub/ClinicOS --comments`.
- List: `gh issue list --repo l2v-hub/ClinicOS --state open --limit 100 --json number,title,body,labels,url`.
  Paginate if there are more results; do not silently drop items.
- A spec becomes a GitHub issue when the user authorizes publication. Read and
  reference the existing issue first; avoid duplicate specs/tickets.
- For multiline issue/PR/comment content, write the exact text to a temporary
  file and use `--body-file`. Preserve newlines and avoid shell interpolation.
- Tickets retain their parent/spec, individual acceptance criteria, dependencies,
  and per-issue evidence. Use native dependencies/sub-issues where supported;
  otherwise record linked task lists and explicit `Blocked by: #N` references.

## Existing workflow and ownership

Before claiming implementation, inspect the current durable controller state,
active worktrees, issue comments and linked PRs. Aggregate issues sharing a root
cause or affected files while preserving acceptance/evidence for every issue.
Do not start competing work on a scope already owned by a worker.

The existing `codex-run`, `codex-triage`, `claude-review-ready` and
`codex-review-ready` workflow is separate from installing these skills. This
setup adds no triggers, labels, queue entries, or model runs. Follow the current
user-authorized handoff protocol and `docs/codex-bug-workflow.md` when processing
that queue. A skill invocation is not permission to reset the durable history
or manufacture an approval.

## Completion and releases

The repository quality gate and the user's current instructions take precedence
over generic skill close/commit advice. Installation does not authorize any
application deployment. For functional bugs, implementation, a review approval,
a green build, and a merge are distinct from a verified deployed resolution.
Close a source issue only after its acceptance criteria, required checks,
actual deployed behavior and linked screenshot/video evidence are verified.
Use `Refs #N` rather than automatic closing keywords before that verification.
Preserve exact-SHA review provenance and independently verify peer findings.
Never fabricate a human review or claim that tests/deploys ran when they did not.

## Pull requests as a triage surface

**PRs as a request surface: no.** This means external PRs are not newly enrolled
as feature requests by `/triage`; it does not disable the existing PR review
handoff between Codex and Claude.
