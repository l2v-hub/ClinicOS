---
id: "component.agent-team.agent-team.src.commands.status.run"
kind: "typescript-function"
title: "run"
status: "observed"
summary: "Exported function from agent-team/src/commands/status.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/commands/status.mjs"
    symbol: "run"
    line_start: "26"
    line_end: "53"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/commands/status.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.agent-team.agent-team.src.commands.status.run` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.commands.status.run is the canonical typescript-function named run.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `run`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/commands/status.mjs:26-53` — run

## Related Knowledge

- `belongs-to` → `project.agent-team`
