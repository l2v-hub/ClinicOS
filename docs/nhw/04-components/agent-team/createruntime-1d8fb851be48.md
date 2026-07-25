---
id: "component.agent-team.agent-team.src.runtime.createruntime"
kind: "typescript-function"
title: "createRuntime"
status: "observed"
summary: "Exported function from agent-team/src/runtime.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/runtime.mjs"
    symbol: "createRuntime"
    line_start: "26"
    line_end: "244"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/runtime.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.agent-team.agent-team.src.runtime.createruntime` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.runtime.createruntime is the canonical typescript-function named createRuntime.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/commands/doctor-entry.mjs`
- `agent-team/src/commands/once.mjs`
- `agent-team/src/commands/start.mjs`
- `agent-team/tests/integration/remediation-loop.test.mjs`
- `agent-team/tests/unit/claim-worktree-authority.test.mjs`
- `agent-team/tests/unit/lease-heartbeat.test.mjs`

## Invariants

The symbol is exported across its module boundary as `createRuntime`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/runtime.mjs:26-244` — createRuntime

## Related Knowledge

- `belongs-to` → `project.agent-team`
