---
id: "component.agent-team.agent-team.src.commands.doctor-entry.run"
kind: "typescript-function"
title: "run"
status: "observed"
summary: "Exported function from agent-team/src/commands/doctor-entry.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/commands/doctor-entry.mjs"
    symbol: "run"
    line_start: "3"
    line_end: "6"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/commands/doctor-entry.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.agent-team.agent-team.src.commands.doctor-entry.run` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.commands.doctor-entry.run is the canonical typescript-function named run.

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

The symbol is exported across its module boundary as `run`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/commands/doctor-entry.mjs:3-6` — run

## Related Knowledge

- `belongs-to` → `project.agent-team`
