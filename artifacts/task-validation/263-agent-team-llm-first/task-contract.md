# Task Contract

## Task
- Title: Agent Team LLM-first con Claude development loop e Codex QA indipendente
- Slug: 263-agent-team-llm-first
- Type: feature
- Date: 2026-07-12
- GitHub issue: l2v-hub/ClinicOS#263
- Branch: codex/agent-team-architecture (base origin/main)
- Worktree: C:/tmp/ClinicOS-agent-team
- Claim: issue comment 4951362695 (work.claim, attempt 1, lease 15661f98-cfee-48c2-a5b0-f0de2efa5da9)
- Spec: docs/superpowers/specs/2026-07-12-agent-team-architecture-design.md
- Plan: docs/superpowers/plans/2026-07-12-agent-team-llm-first.md

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | yes |
| Config / Env | yes |

Notes: new repository-root `agent-team/` orchestration subsystem (Node 20 ESM, no new runtime deps), five new root `package.json` aliases, two `.gitignore` entries. No ClinicOS frontend/backend/prisma/Agnos change. Privacy/Security impacted because the subsystem sanitizes credentials/PHI before persisting logs and enforces prohibited-action boundaries.

## Current Behaviour

`origin/main` has no `agent-team/` orchestration subsystem, no `agent-team:*` npm aliases, no durable GitHub claim protocol for Claude development workers, no independent Codex QA intake for `ready-for-qa`, and no schema-validated LLM-first feedback protocol connecting Codex QA findings to Claude remediation attempts.

## Expected Behaviour

A repository-local Agent Team supervisor discovers eligible GitHub issues (`ready-for-dev` + `assigned-to-claude`), gives development work exclusively to authenticated Claude Code workers via durable GitHub claims, routes completed work (`ready-for-qa`) to an independently invoked Codex QA worker, and loops schema-valid structured QA findings back to Claude on the same issue, branch, worktree, and draft PR. The system never merges, deploys, closes issues, applies `qa-passed` from Claude, or approves its own output. GitHub labels, protocol comments, PR state and committed SHA-bound artifacts are authoritative after restart.

## Acceptance Criteria

- AC1: `agent-team/` contains all orchestration configuration, protocol schemas, prompts, source, tests, documentation; root `package.json` gains exactly the five `agent-team:*` aliases with existing scripts unchanged.
- AC2: `doctor` verifies actual Codex, Claude, GitHub, repository, configuration, worktree and duplicate-instance prerequisites and fails clearly without starting affected workers.
- AC3: missing or unauthenticated Claude CLI prevents every development worker launch.
- AC4: Claude workers acquire only issues with both `ready-for-dev` and `assigned-to-claude`, win a durable GitHub claim, and use a dedicated branch/worktree based on `origin/main` on the first attempt.
- AC5: Claude Code alone performs implementation, tests, evidence, commits, push, draft PR create/update, stopping at `ready-for-qa`.
- AC6: Codex QA processes only `ready-for-qa` issue/PR pairs and independently verifies acceptance criteria, diff, CI, build, typecheck, pertinent tests, privacy/security, secrets and evidence-to-SHA binding.
- AC7: every operational Claude↔Codex message validates against the versioned LLM-first protocol and references content-addressed artifacts.
- AC8: `qa-failed` publishes atomic findings and automatically returns the same issue/branch/worktree/draft-PR to Claude for remediation.
- AC9: Claude remediation maps every unresolved finding to changed code, changed evidence, or an explicit unresolved result before returning to `ready-for-qa`.
- AC10: three consecutive equivalent no-progress failures produce `blocked` with a structured reason.
- AC11: restart/crash recovery reconstructs authoritative work state from GitHub and committed artifacts, not local runtime files.
- AC12: unit + integration tests cover CLI readiness, auth absence, state eligibility, claim races, lease expiry, duplicate supervisors, process crashes, invalid JSON, invalid transitions, SHA/digest mismatches, remediation loops, no-progress blocking, sanitization, prohibited actions.
- AC13: no code path performs automatic merge, deployment, issue closure, `qa-passed` by Claude, or QA self-approval.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | node:test suites for config, sanitize/process-runner, doctor, protocol, state machine, GitHub adapter, locks, workers, remediation (TDD RED→GREEN) |
| Integration | yes | supervisor reconciliation gating, duplicate supervisor, prohibited-action static gate |
| API | no | no ClinicOS API change |
| Playwright | no | CLI-only orchestration issue, no UI path (spec: N/A) |
| Persistence after refresh | no | no application data change |
| Agnos action registry | no | not impacted |
| Voice simulation | no | not impacted |
| OCR/import test | no | not impacted |
| Security/privacy scan | yes | sanitization unit tests + prohibited-action static scan + secret-free evidence |

Additional checks: `node --check` syntax pass on all new .mjs, `npm run build` (root) regression pass, real read-only doctor smoke via `npm run agent-team:doctor` (sanitized), `git diff --check`.

## Evidence Plan

Required evidence (under `artifacts/task-validation/263-agent-team-llm-first/`):

- task-contract.md (this file)
- validation-report.md — commands, exit codes, final state `READY FOR CODEX QA`
- test-results/unit.tap, test-results/integration.tap (fresh aggregate runs)
- test-results/tdd/*.txt — recorded RED failure and GREEN pass output per TDD task
- logs/doctor-smoke.sanitized.json — real doctor run, secrets/account identifiers redacted
- logs/build.txt, logs/node-check.txt, logs/prohibited-scan.txt
- agent-team/development-handoff.json + agent-team/artifact-manifest.json — schema-valid, SHA-256 digests, bound to subject SHA
- cli-help/ — verified CLI interface record (gh/git/node/npm versions; claude/codex surface per PO-verified contract)

Not required: screenshots, video, Playwright trace/report (no UI path per spec).

## Risks

- Claude/Codex CLIs are not directly invocable under this session's scoped allowlist; live doctor smoke runs through the sanctioned `npm run agent-team:doctor` alias and worker argv uses only PO-verified/plan-approved options (deviation recorded in validation-report.md).
- Committed manifest subject_sha vs. final PR head: manifest is bound to the evidence-generation HEAD; the published handoff comment is bound to the final pushed head SHA (binding note in validation-report.md).
- Windows paths in tests use `path.join`/`tmpdir()` to stay portable.

## Gate Status

READY FOR IMPLEMENTATION
