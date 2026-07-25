---
id: "runtime.agent-team.supervisor"
kind: "runtime-orchestrator"
title: "Agent-team supervisor lifecycle"
status: "observed"
summary: "Agent-team runtime coordinates claim, recovery, worker execution, remediation, and shutdown."
bounded_contexts: []
sources:
  - path: "agent-team/src/runtime.mjs"
    confidence: "observed"
  - path: "agent-team/src/cli.mjs"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/runtime.mjs,agent-team/src/cli.mjs"
    confidence: "observed"
tags:
  - "runtime-orchestrator"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `runtime.agent-team.supervisor` represent in ClinicOS?

## Canonical Definition

runtime.agent-team.supervisor is the canonical runtime-orchestrator named Agent-team supervisor lifecycle.

## Inputs

Inputs are defined by the cited composition, contract, configuration, or governance sources.

## Outputs

Agent-team runtime coordinates claim, recovery, worker execution, remediation, and shutdown.

## Dependencies

Owning knowledge target: `project.agent-team`.

## Side Effects

Creates claims, worktrees, worker processes, evidence, protocol comments, and local runtime state.

## Consumers

Runtime components, operators, delivery automation, and future autonomous agents.

## Invariants

Executable sources listed in Evidence are authoritative over lower-precedence narrative claims.

## Failure Modes

Failure behavior is inherited from the cited runtime, integration, configuration, or gate implementation.

## Evidence

- `agent-team/src/runtime.mjs`
- `agent-team/src/cli.mjs`

## Related Knowledge

- `belongs-to` → `project.agent-team`
