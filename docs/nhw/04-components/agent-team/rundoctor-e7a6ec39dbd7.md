---
id: "component.agent-team.agent-team.src.commands.doctor.rundoctor"
kind: "typescript-function"
title: "runDoctor"
status: "observed"
summary: "Exported function from agent-team/src/commands/doctor.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/commands/doctor.mjs"
    symbol: "runDoctor"
    line_start: "64"
    line_end: "301"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/commands/doctor.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.agent-team.agent-team.src.commands.doctor.rundoctor` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.commands.doctor.rundoctor is the canonical typescript-function named runDoctor.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/runtime.mjs`
- `agent-team/tests/unit/doctor.test.mjs`

## Invariants

The symbol is exported across its module boundary as `runDoctor`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/commands/doctor.mjs:64-301` — runDoctor

## Related Knowledge

- `belongs-to` → `project.agent-team`
