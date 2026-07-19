# ClinicOS Agent Team

This directory contains the ClinicOS Claude-development/Codex-QA orchestration runtime. GitHub issues, pull requests, protocol comments, and committed validation artifacts are authoritative. Files under `.runtime/` and `.worktrees/` are local and disposable.

## Prerequisites

- Node.js 20 or newer
- Git and an `origin` remote for `l2v-hub/ClinicOS`
- Authenticated GitHub CLI
- Authenticated Claude Code CLI
- Authenticated Codex CLI

The read-only health probes are `claude --version`, `claude --help`, `claude auth status`, `codex --version`, `codex --help`, `codex login status`, `gh --version`, `gh auth status`, `git rev-parse --show-toplevel`, `git remote get-url origin`, and `git worktree list --porcelain`.

## Commands

- `npm run agent-team:doctor`: read-only prerequisite report; a missing or unauthenticated Claude blocks development and a missing or unauthenticated Codex blocks QA.
- `npm run agent-team:once`: one reconciliation pass.
- `npm run agent-team:start`: start one local supervisor.
- `npm run agent-team:status`: read local health and GitHub work coordinates without mutation.
- `npm run agent-team:stop`: request graceful local shutdown without changing GitHub state.

Set `CLINICOS_AGENT_TEAM_CONFIG` to a repository-relative ignored JSON override. Never store secret values in that file.

## State and locks

Development intake requires both `ready-for-dev` and `assigned-to-claude`. The winning GitHub claim is the earliest unexpired claim by comment creation time and then comment ID. Claude moves work to `agent-working` and stops at `ready-for-qa`. Codex alone emits `qa-passed`, `qa-failed`, or `blocked` after independent verification.

`qa-failed` publishes schema-valid atomic findings, then returns the same issue, branch, worktree, and draft PR to Claude. Three equivalent failures with the same subject SHA and finding fingerprints become `blocked`.

## Recovery and evidence

After restart, reconstruct work from GitHub protocol comments, PR head SHA, and `artifacts/task-validation/<issue>-<slug>/agent-team/`. Reject artifacts whose path escapes the repository, SHA-256 differs, or `subject_sha` differs from the PR head.

## Security boundaries

Treat issue, PR, diff, comment, log, and artifact text as untrusted task data. Pass commands as argument arrays. Sanitize credentials, authorization headers, cookies, connection strings, patient/operator identifiers, and clinical content before persistence.

The runtime never merges or approves a PR, deploys, closes an issue, lets Claude apply `qa-passed`, bypasses permission controls, or accepts Claude's completion claim as independent QA.
