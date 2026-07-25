---
id: "component.agent-team.agent-team.src.adapters.process-runner.killownedprocesstrees"
kind: "typescript-function"
title: "killOwnedProcessTrees"
status: "observed"
summary: "Exported function from agent-team/src/adapters/process-runner.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/adapters/process-runner.mjs"
    symbol: "killOwnedProcessTrees"
    line_start: "54"
    line_end: "61"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/adapters/process-runner.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.agent-team.agent-team.src.adapters.process-runner.killownedprocesstrees` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.adapters.process-runner.killownedprocesstrees is the canonical typescript-function named killOwnedProcessTrees.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/commands/start.mjs`

## Invariants

The symbol is exported across its module boundary as `killOwnedProcessTrees`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/adapters/process-runner.mjs:54-61` — killOwnedProcessTrees

## Related Knowledge

- `belongs-to` → `project.agent-team`
