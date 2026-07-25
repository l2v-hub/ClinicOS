---
id: "flow.agent-team-task-lifecycle"
kind: "runtime-flow"
title: "Agent-team claim, development, QA, and closure"
status: "inferred"
summary: "Agent-team claim, development, QA, and closure workflow across ClinicOS components."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/adapters/git.mjs"
    symbol: "createGitAdapter"
    line_start: "15"
    line_end: "169"
    confidence: "observed"
  - path: "agent-team/src/adapters/git.mjs"
    symbol: "isSameWorktreePath"
    line_start: "11"
    line_end: "13"
    confidence: "observed"
  - path: "agent-team/src/adapters/git.mjs"
    symbol: "normalizeWorktreePath"
    line_start: "6"
    line_end: "9"
    confidence: "observed"
  - path: "agent-team/src/adapters/github.mjs"
    symbol: "createGitHubAdapter"
    line_start: "1"
    line_end: "112"
    confidence: "observed"
  - path: "agent-team/src/adapters/process-runner.mjs"
    symbol: "defaultKillTree"
    line_start: "7"
    line_end: "15"
    confidence: "observed"
  - path: "agent-team/src/adapters/process-runner.mjs"
    symbol: "exitHookInstalled"
    line_start: "21"
    line_end: "21"
    confidence: "observed"
  - path: "agent-team/src/adapters/process-runner.mjs"
    symbol: "installExitHook"
    line_start: "46"
    line_end: "52"
    confidence: "observed"
  - path: "agent-team/src/adapters/process-runner.mjs"
    symbol: "killOwnedProcessTrees"
    line_start: "54"
    line_end: "61"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "agent-team/src/adapters/git.mjs,agent-team/src/adapters/git.mjs,agent-team/src/adapters/git.mjs,agent-team/src/adapters/github.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs"
    confidence: "inferred"
  - type: "invokes"
    target: "component.agent-team.agent-team.src.adapters.git.creategitadapter"
    evidence: "agent-team/src/adapters/git.mjs,agent-team/src/adapters/git.mjs,agent-team/src/adapters/git.mjs,agent-team/src/adapters/github.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs"
    confidence: "inferred"
  - type: "invokes"
    target: "component.agent-team.agent-team.src.adapters.git.issameworktreepath"
    evidence: "agent-team/src/adapters/git.mjs,agent-team/src/adapters/git.mjs,agent-team/src/adapters/git.mjs,agent-team/src/adapters/github.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs"
    confidence: "inferred"
  - type: "invokes"
    target: "component.agent-team.agent-team.src.adapters.github.creategithubadapter"
    evidence: "agent-team/src/adapters/git.mjs,agent-team/src/adapters/git.mjs,agent-team/src/adapters/git.mjs,agent-team/src/adapters/github.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs"
    confidence: "inferred"
  - type: "invokes"
    target: "component.agent-team.agent-team.src.adapters.process-runner.killownedprocesstrees"
    evidence: "agent-team/src/adapters/git.mjs,agent-team/src/adapters/git.mjs,agent-team/src/adapters/git.mjs,agent-team/src/adapters/github.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs,agent-team/src/adapters/process-runner.mjs"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.agent-team-task-lifecycle` represent in ClinicOS?

## Canonical Definition

flow.agent-team-task-lifecycle is the canonical runtime-flow named Agent-team claim, development, QA, and closure.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `component.agent-team.agent-team.src.adapters.git.creategitadapter`
- `component.agent-team.agent-team.src.adapters.git.issameworktreepath`
- `component.agent-team.agent-team.src.adapters.github.creategithubadapter`
- `component.agent-team.agent-team.src.adapters.process-runner.killownedprocesstrees`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `agent-team/src/adapters/git.mjs:15-169` — createGitAdapter
- `agent-team/src/adapters/git.mjs:11-13` — isSameWorktreePath
- `agent-team/src/adapters/git.mjs:6-9` — normalizeWorktreePath
- `agent-team/src/adapters/github.mjs:1-112` — createGitHubAdapter
- `agent-team/src/adapters/process-runner.mjs:7-15` — defaultKillTree
- `agent-team/src/adapters/process-runner.mjs:21-21` — exitHookInstalled
- `agent-team/src/adapters/process-runner.mjs:46-52` — installExitHook
- `agent-team/src/adapters/process-runner.mjs:54-61` — killOwnedProcessTrees

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `component.agent-team.agent-team.src.adapters.git.creategitadapter`
- `invokes` → `component.agent-team.agent-team.src.adapters.git.issameworktreepath`
- `invokes` → `component.agent-team.agent-team.src.adapters.github.creategithubadapter`
- `invokes` → `component.agent-team.agent-team.src.adapters.process-runner.killownedprocesstrees`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `component.agent-team.agent-team.src.adapters.git.creategitadapter` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `component.agent-team.agent-team.src.adapters.git.issameworktreepath` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `component.agent-team.agent-team.src.adapters.git.normalizeworktreepath` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `component.agent-team.agent-team.src.adapters.github.creategithubadapter` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `component.agent-team.agent-team.src.adapters.process-runner.defaultkilltree` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `component.agent-team.agent-team.src.adapters.process-runner.exithookinstalled` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `component.agent-team.agent-team.src.adapters.process-runner.installexithook` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `component.agent-team.agent-team.src.adapters.process-runner.killownedprocesstrees` | Defined by cited component | Owning component error contract |
