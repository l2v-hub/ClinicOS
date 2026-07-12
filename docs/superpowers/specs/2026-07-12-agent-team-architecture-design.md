# Agent Team LLM-First Architecture Design

**Status:** Approved design
**Date:** 2026-07-12
**GitHub issue:** #263
**Base:** `origin/main`

## PO Context

ClinicOS needs a durable Agent Team in which Codex remains Product Owner, orchestrator, independent QA controller, and delivery gatekeeper while Claude Code is the only development implementer. GitHub must remain the recoverable source of truth across supervisor restarts, worker crashes, and machine restarts.

The orchestration infrastructure must be isolated under the repository-root `agent-team/` directory. The Agent Team surface in the root `package.json` consists only of the five supported operator aliases; existing non-Agent-Team scripts remain unchanged.

## User Impact

The team currently lacks a repeatable, restart-safe mechanism for assigning approved work to Claude Code, validating it independently with Codex, and returning precise QA findings to Claude until the acceptance criteria are satisfied. Without this architecture, implementation and QA can be conflated, evidence can become detached from the reviewed commit, and interrupted work may require manual reconstruction.

## Current Behaviour

- `origin/main` has no `agent-team/` orchestration subsystem.
- The five required `agent-team:*` commands are not present.
- There is no durable GitHub claim protocol for Claude development workers.
- There is no automated but independent Codex QA intake for `ready-for-qa` work.
- There is no schema-validated, LLM-first feedback protocol connecting Codex QA findings to the next Claude remediation attempt.

## Expected Behaviour

ClinicOS provides a repository-local Agent Team supervisor that discovers eligible GitHub issues, gives development work exclusively to authenticated Claude Code workers, routes completed work to an independently invoked Codex QA worker, and loops structured QA findings back to Claude on the same issue, branch, worktree, and draft pull request.

The system never merges, deploys, closes issues, or approves its own development output.

## Scope

- Add a self-contained `agent-team/` directory with configuration, protocol schemas, prompts, source modules, tests, and operator documentation.
- Add the five required root npm aliases:
  - `npm run agent-team:doctor`
  - `npm run agent-team:once`
  - `npm run agent-team:start`
  - `npm run agent-team:status`
  - `npm run agent-team:stop`
- Implement Claude development worker discovery, GitHub locking, branch/worktree management, prompt generation, process invocation, handoff, and remediation loops.
- Implement separate Codex QA worker discovery, prompt generation, independent verification invocation, structured QA decision intake, and feedback publication.
- Make GitHub issue labels, comments, pull request state, and committed validation artifacts authoritative after restart.
- Provide deterministic LLM-to-LLM exchange using versioned JSON Schema.
- Provide unit and integration tests for orchestration, state transitions, process failures, locking, recovery, and protocol validation.

## Out of Scope

- ClinicOS frontend, backend, database, or clinical workflow changes.
- A graphical Agent Team dashboard.
- Hosted queues, databases, or external orchestration services.
- Automatic pull request merge or approval.
- Automatic deployment.
- Automatic GitHub issue closure.
- Bypassing Claude Code, Codex, GitHub, or filesystem permission controls.
- Storing credentials or tokens in repository files, prompts, comments, logs, or validation artifacts.

## Architecture Decision

The selected approach is a repository-root `agent-team/` subsystem. This keeps orchestration cohesive and testable while allowing the root package scripts to remain stable operator entry points.

The rejected alternatives are:

1. `scripts/agent-team/`: rejected because configuration, protocol definitions, prompts, tests, and runtime control would be mixed with unrelated utility scripts.
2. A separate repository or service: rejected because distribution, version coordination, and hosted state are unnecessary for the current single-repository objective.

## Directory and Component Boundaries

```text
agent-team/
├── README.md
├── config/
│   ├── default.json
│   └── config.schema.json
├── prompts/
│   ├── claude-development.md
│   └── codex-qa.md
├── protocol/
│   └── schemas/
│       ├── message.schema.json
│       ├── development-handoff.schema.json
│       ├── qa-result.schema.json
│       └── artifact-manifest.schema.json
├── src/
│   ├── cli.mjs
│   ├── commands/
│   │   ├── doctor.mjs
│   │   ├── once.mjs
│   │   ├── start.mjs
│   │   ├── status.mjs
│   │   └── stop.mjs
│   ├── adapters/
│   │   ├── process-runner.mjs
│   │   ├── github.mjs
│   │   └── git.mjs
│   ├── core/
│   │   ├── config.mjs
│   │   ├── labels.mjs
│   │   ├── locks.mjs
│   │   ├── protocol.mjs
│   │   ├── reconciler.mjs
│   │   └── state-machine.mjs
│   └── workers/
│       ├── claude-development-worker.mjs
│       └── codex-qa-worker.mjs
└── tests/
    ├── fixtures/
    ├── unit/
    └── integration/
```

`agent-team/.runtime/` is created locally, ignored by Git, and contains only ephemeral supervisor state such as PID, heartbeat, and the last local error. It is never authoritative for issue workflow state.

Each module has one boundary:

- `commands/` translates operator commands into core operations.
- `adapters/` is the only layer allowed to invoke external processes, GitHub CLI, and Git.
- `core/` owns deterministic state, locking, protocol validation, and reconciliation.
- `workers/` builds validated prompts and interprets validated worker results; it does not hide state changes inside prompts.
- `protocol/schemas/` is the contract shared by Claude and Codex.
- `prompts/` contains permanent role constraints and requires schema-conforming output.

## Roles and Trust Boundaries

### Codex PO Coordinator

- Normalizes work into a complete GitHub issue contract.
- Applies `ready-for-dev` and `assigned-to-claude` only after scope, acceptance criteria, tests, evidence, and Definition of Done are complete.
- Does not write application or orchestration implementation code.
- Does not accept a Claude completion claim as QA evidence.

### Claude Development Worker

- Is the only worker allowed to implement code.
- Acquires only issues containing both `ready-for-dev` and `assigned-to-claude`.
- Works on a dedicated branch and worktree based on `origin/main` for the first attempt.
- Reuses the same branch, worktree, and draft pull request for remediation attempts.
- Runs tests, creates evidence, commits changes, pushes the branch, and opens or updates a draft pull request.
- Stops at `ready-for-qa`.
- Cannot merge, deploy, close issues, apply `qa-passed`, or approve its own output.

### Codex QA Gatekeeper

- Acquires only issues and pull requests in `ready-for-qa`.
- Runs in a separate process and prompt from Claude.
- Reads the issue contract, exact pull request diff, CI state, and evidence manifest.
- Independently reruns the pertinent build, typecheck, unit, integration, functional, Playwright, privacy, and security checks.
- Rejects evidence whose subject commit does not equal the reviewed pull request head SHA.
- Emits `qa-passed`, `qa-failed`, or `blocked` as a structured QA result.
- Cannot merge, deploy, or automatically close the issue.

## GitHub State Machine

The normal path is:

```text
ready-for-dev + assigned-to-claude
→ agent-working
→ ready-for-qa
→ qa-passed | qa-failed | blocked
```

The remediation loop is:

```text
qa-failed
→ ready-for-dev + assigned-to-claude
→ agent-working
→ ready-for-qa
→ qa-passed | qa-failed | blocked
```

On `qa-failed`, Codex first publishes the validated QA result. The reconciler then makes the issue eligible for Claude remediation by applying `ready-for-dev` and `assigned-to-claude`. When Claude wins the claim, it removes the intake labels, removes the previous `qa-failed` current-state label, and applies `agent-working`. The immutable QA result comment and committed QA artifact preserve the failure history.

Repeated attempts that reproduce the same blocking finding without a changed subject SHA or changed evidence fingerprint transition to `blocked` after the configured no-progress limit. The default no-progress limit is three consecutive equivalent failures. `blocked` requires a machine-readable reason and never causes merge, deploy, or closure.

## Durable GitHub Locking

Each claim is a protocol message stored as a GitHub issue comment. It includes worker identity, issue number, attempt number, lease identifier, acquisition time, expiry time, branch, worktree identity, and pull request when present.

Because labels and comments are not an atomic compare-and-swap operation, concurrent claimants use deterministic arbitration:

1. Publish a schema-valid `work.claim` message.
2. Refresh all unexpired claims for the same issue and attempt.
3. Sort by GitHub `created_at`, then numeric comment identifier.
4. Only the first claim is the winner.
5. Losing claimants publish `work.claim_released` and perform no branch, worktree, label, or code mutation.
6. The winner refreshes its lease by editing the same claim message.
7. A worker may recover an expired lease only after re-reading GitHub state and publishing a new claim for the next lease generation.

A local exclusive PID file prevents duplicate supervisors on the same machine. The GitHub claim remains authoritative across machines and after restart.

## LLM-First Exchange Protocol

Claude and Codex exchange operational state for LLM consumption, not as human-oriented narrative. The primary contract is structured JSON validated against schemas under `agent-team/protocol/schemas/`.

Every GitHub protocol comment contains exactly one marker and one JSON object:

```text
<!-- clinic-os-agent-team:v1 -->
{...schema-valid JSON...}
```

Large logs, diffs, traces, screenshots, and test reports are never copied into the message. The payload carries content-addressed references to committed or attached artifacts.

Every message includes:

- `schema_version`
- `message_type`
- `message_id`
- `correlation_id`
- `producer_role`
- `repository`
- `issue_number`
- `pull_request_number` when present
- `attempt`
- `created_at`
- `subject_sha`
- `state_before`
- `state_after`
- `acceptance_criteria`
- `findings`
- `commands`
- `artifact_refs`
- `next_actions`

Finding objects are atomic and stable across attempts. Each finding contains:

- `finding_id`
- `acceptance_criterion_id`
- `severity`
- `category`
- `observed`
- `expected`
- `reproduction_command_ref`
- `evidence_refs`
- `status`
- `remediation_required`
- `fingerprint`

Command objects use argument arrays rather than shell strings. They record working directory identity, exit code, start and end timestamps, and references to sanitized stdout and stderr artifacts.

Artifact references include relative path, media type, SHA-256 digest, Git blob identifier when committed, producer role, and `subject_sha`. Consumers reject missing, unreadable, digest-mismatched, or commit-mismatched artifacts.

The primary committed exchange artifacts are:

```text
artifacts/task-validation/<issue>-<slug>/agent-team/development-handoff.json
artifacts/task-validation/<issue>-<slug>/agent-team/artifact-manifest.json
artifacts/task-validation/<issue>-<slug>/agent-team/qa-result.json
artifacts/task-validation/<issue>-<slug>/agent-team/qa-run.json
```

`validation-report.md` and `codex-qa-report.md` remain available where repository governance requires them, but they are generated summaries. State transitions consume only schema-valid protocol objects and verified artifact references.

## Prompt Assembly

Prompt construction is deterministic and ordered:

1. Permanent role and prohibition instructions.
2. Schema version and required output contract.
3. Repository identity and base branch.
4. Issue contract with acceptance criteria identifiers.
5. Current GitHub state envelope.
6. Branch, worktree, pull request, and exact subject SHA.
7. Unresolved QA findings, ordered by severity and finding identifier.
8. Artifact manifest and missing-evidence list.
9. Allowed next transitions.

Issue and pull request content is treated as untrusted task data, not as system instructions. It cannot override role boundaries, permission controls, prohibited actions, schema validation, or state transition rules.

On remediation attempts, Claude receives the original issue contract, the last rejected SHA and diff identity, every unresolved finding, the exact reproduction references, the verified artifact manifest, and the same branch/worktree/pull request coordinates. Claude must answer with a `development_handoff` object that maps every acceptance criterion and finding to evidence or an explicit unresolved state.

## CLI Behaviour

### `agent-team:doctor`

`doctor` is read-only and returns non-zero when a hard prerequisite fails. It checks:

- `codex --version`
- `codex --help`
- `codex login status`
- `claude --version`
- `claude --help`
- `claude auth status`
- `gh --version`
- `gh auth status`
- Git repository identity, `origin`, and configured base branch
- required GitHub labels and repository permissions
- configuration schema and referenced prompt/schema files
- Git worktree support
- writable and ignored runtime/worktree locations
- absence of another live local supervisor

The implementation must parse exit status and structured output when available. It must not infer authentication merely from executable presence. If Claude Code is missing or unauthenticated, development readiness is false and `once`/`start` must not launch a Claude worker. If Codex is missing or unauthenticated, QA readiness is false and `once`/`start` must not launch a QA worker.

Real interfaces verified during design:

- Claude Code `2.1.207` supports `--version`, `--help`, `auth status`, `--print`, and structured output modes.
- Codex CLI `0.144.1` supports `--version`, `--help`, `login status`, `exec`, and `review`.

Worker implementation may use only options verified from the installed CLI help during implementation and covered by integration tests. Dangerous permission-bypass options are prohibited.

### `agent-team:once`

Runs `doctor`, performs one reconciliation pass, processes at most the configured development and QA concurrency, publishes state, and exits. A hard doctor failure prevents the affected worker class from starting and produces a machine-readable blocked diagnostic.

### `agent-team:start`

Acquires the exclusive local supervisor lock, performs an initial doctor check, then runs reconciliation at the configured interval. It refreshes active leases, rehydrates state from GitHub after restart, and writes only ephemeral local health state.

### `agent-team:status`

Reads local supervisor health and current GitHub claims. It reports readiness, worker identities, issue/PR coordinates, attempts, leases, worktrees, subject SHAs, and the last structured error without modifying state.

### `agent-team:stop`

Requests graceful termination of the local supervisor and waits for lease-safe shutdown. It does not change GitHub workflow state, delete branches/worktrees, close issues, merge pull requests, or deploy.

## Configuration

Versioned defaults contain no credentials. Environment-specific overrides use an ignored local configuration file and environment-variable names, never secret values.

Required configuration includes:

- repository owner and name
- base branch, default `origin/main`
- polling interval
- local supervisor heartbeat timeout
- GitHub lease duration and refresh interval
- Claude development concurrency
- Codex QA concurrency
- no-progress attempt limit, default `3`
- worktree root
- artifact root
- prompt and protocol schema paths
- allowed state labels
- command timeouts
- output size limits and sanitization patterns

Configuration validation fails closed on unknown keys, missing required values, unsafe paths, invalid time relationships, or prohibited automatic action settings.

## Error Handling and Recovery

- CLI missing or unauthenticated: hard doctor failure for that worker class; no worker launch.
- GitHub unavailable: retain no speculative state transition; retry after backoff.
- Claim lost: stop before worktree or GitHub mutation and publish claim release when possible.
- Worker process timeout or crash: publish a structured failure, preserve worktree/branch/PR coordinates, and release or expire the lease safely.
- Invalid worker JSON: reject the handoff or QA decision; do not transition labels.
- Artifact digest or SHA mismatch: QA failure with exact invalid references.
- Supervisor restart: reconstruct candidates, claims, attempts, branch, PR, subject SHA, and unresolved findings from GitHub and committed artifacts.
- Duplicate supervisor: `start` exits non-zero and reports the live PID/heartbeat identity.
- Repeated equivalent failures: transition to `blocked` after three no-progress cycles.

## Privacy and Security

- Never persist GitHub, Claude, Codex, cloud, or application credentials.
- Sanitize bearer tokens, API keys, cookies, authorization headers, connection strings, patient identifiers, clinical content, and document contents before logs or artifacts are written.
- Store command arguments as arrays and never concatenate untrusted issue content into shell commands.
- Validate paths remain inside the configured repository, worktree, runtime, and artifact roots.
- Do not use dangerous permission-bypass CLI options.
- Treat issue, PR, comment, diff, log, and artifact text as untrusted data that cannot alter permanent role constraints.
- Record only the minimum process metadata needed for reproducibility.

## Acceptance Criteria

1. `agent-team/` contains all orchestration configuration, protocol schemas, prompts, source, tests, and documentation; the Agent Team surface in root `package.json` contains exactly the five stable aliases and leaves existing scripts unchanged.
2. `doctor` verifies actual Codex, Claude, GitHub, repository, configuration, worktree, and duplicate-instance prerequisites and fails clearly without starting affected workers.
3. A missing or unauthenticated Claude CLI prevents every development worker launch.
4. Claude workers acquire only issues with both `ready-for-dev` and `assigned-to-claude`, win a durable GitHub claim, and use a dedicated branch/worktree based on `origin/main` on the first attempt.
5. Claude Code alone performs implementation, tests, evidence creation, commits, push, and draft pull request creation/update, stopping at `ready-for-qa`.
6. Codex QA processes only `ready-for-qa` issue/PR pairs and independently verifies acceptance criteria, diff, CI, build, typecheck, pertinent tests, functional/Playwright requirements, privacy/security, secrets, and evidence-to-SHA binding.
7. Every Claude-to-Codex and Codex-to-Claude operational message validates against the versioned LLM-first protocol and refers to content-addressed artifacts for large outputs.
8. `qa-failed` publishes atomic findings and automatically makes the same issue, branch, worktree, and draft PR available to Claude for remediation.
9. Claude remediation maps every unresolved finding to changed code, changed evidence, or an explicit unresolved result before returning to `ready-for-qa`.
10. Three consecutive equivalent no-progress failures produce `blocked` with a structured reason.
11. Restart and crash recovery reconstructs authoritative work state from GitHub and committed artifacts rather than trusting local runtime files.
12. Unit and integration tests cover CLI readiness, authentication absence, state eligibility, claim races, lease expiry, duplicate supervisors, process crashes, invalid JSON, invalid state transitions, SHA/digest mismatches, remediation loops, no-progress blocking, sanitization, and prohibited actions.
13. No code path performs automatic merge, deployment, issue closure, `qa-passed` by Claude, or QA self-approval.

## QA Requirements

Codex independently performs and records:

- full diff review against `origin/main`
- Node syntax/type validation applicable to the implementation
- all `agent-team/tests/unit/` tests
- all `agent-team/tests/integration/` tests using controlled fake executables and a non-production GitHub fixture boundary
- real read-only doctor smoke test against installed Codex, Claude, GitHub, and Git CLIs
- development launch refusal with a simulated missing Claude executable
- development launch refusal with simulated unauthenticated Claude output
- duplicate-supervisor refusal
- concurrent-claim arbitration test
- QA-failed-to-Claude remediation loop test on the same branch/PR identity
- invalid evidence SHA and digest rejection tests
- secret and clinical-data sanitization tests
- static search proving absence of merge, deploy, closure, and dangerous bypass execution paths

## Playwright / E2E Requirements

N/A for this CLI-only orchestration issue. Agent Team must still enforce Playwright evidence requirements for application issues carrying the relevant requirement or label.

## Evidence Required

Store evidence under:

```text
artifacts/task-validation/263-agent-team-llm-first/
```

Required evidence:

- `task-contract.md`
- `validation-report.md`
- `codex-qa-report.md`
- `agent-team/development-handoff.json`
- `agent-team/artifact-manifest.json`
- `agent-team/qa-result.json`
- `agent-team/qa-run.json`
- unit test results
- integration test results
- doctor smoke output with secrets and account identifiers sanitized
- simulated missing/unauthenticated Claude results
- claim race and remediation-loop results
- SHA/digest mismatch rejection results
- prohibited-action static scan results
- dependency and baseline warning record

Screenshots, video, Playwright trace, and Playwright report are not required because this issue has no UI path.

## Definition of Done

The issue is deliverable only when:

- every acceptance criterion has a machine-readable result and reproducible evidence;
- Claude Code produced the implementation and draft pull request;
- Codex independently reviewed the exact pull request head SHA;
- all required unit, integration, smoke, recovery, security, and prohibited-action checks pass;
- evidence manifests are readable, digest-valid, and bound to the reviewed SHA;
- no secret, account identifier, clinical content, or patient identifier appears in logs or artifacts;
- `validation-report.md` records commands, outcomes, evidence, and the final QA decision;
- Codex applies `qa-passed` only after independent verification;
- no automatic merge, deployment, issue closure, or self-approval exists;
- any issue closure remains a separate explicit Codex gatekeeper action after the repository closure checks pass.
