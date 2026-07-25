---
id: "component.agent-team.agent-team.src.core.locks.acquirelocalsupervisorlock"
kind: "typescript-function"
title: "acquireLocalSupervisorLock"
status: "observed"
summary: "Exported function from agent-team/src/core/locks.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/locks.mjs"
    symbol: "acquireLocalSupervisorLock"
    line_start: "140"
    line_end: "159"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/locks.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.locks.acquirelocalsupervisorlock` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.locks.acquirelocalsupervisorlock is the canonical typescript-function named acquireLocalSupervisorLock.

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
- `agent-team/tests/integration/supervisor.test.mjs`
- `agent-team/tests/unit/locks.test.mjs`

## Invariants

The symbol is exported across its module boundary as `acquireLocalSupervisorLock`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/locks.mjs:140-159` — acquireLocalSupervisorLock

## Related Knowledge

- `belongs-to` → `project.agent-team`
