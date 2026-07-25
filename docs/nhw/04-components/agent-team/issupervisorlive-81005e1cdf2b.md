---
id: "component.agent-team.agent-team.src.core.locks.issupervisorlive"
kind: "typescript-function"
title: "isSupervisorLive"
status: "observed"
summary: "Exported function from agent-team/src/core/locks.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/locks.mjs"
    symbol: "isSupervisorLive"
    line_start: "161"
    line_end: "171"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.locks.issupervisorlive` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.locks.issupervisorlive is the canonical typescript-function named isSupervisorLive.

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
- `agent-team/src/commands/stop.mjs`
- `agent-team/src/runtime.mjs`

## Invariants

The symbol is exported across its module boundary as `isSupervisorLive`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/locks.mjs:161-171` — isSupervisorLive

## Related Knowledge

- `belongs-to` → `project.agent-team`
