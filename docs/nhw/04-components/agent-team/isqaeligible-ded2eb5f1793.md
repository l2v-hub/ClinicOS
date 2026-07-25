---
id: "component.agent-team.agent-team.src.core.state-machine.isqaeligible"
kind: "typescript-function"
title: "isQaEligible"
status: "observed"
summary: "Exported function from agent-team/src/core/state-machine.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/state-machine.mjs"
    symbol: "isQaEligible"
    line_start: "15"
    line_end: "23"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/state-machine.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.state-machine.isqaeligible` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.state-machine.isqaeligible is the canonical typescript-function named isQaEligible.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/tests/unit/state-machine.test.mjs`

## Invariants

The symbol is exported across its module boundary as `isQaEligible`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/state-machine.mjs:15-23` — isQaEligible

## Related Knowledge

- `belongs-to` → `project.agent-team`
