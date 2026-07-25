---
id: "component.agent-team.agent-team.src.core.locks.arbitrateclaims"
kind: "typescript-function"
title: "arbitrateClaims"
status: "observed"
summary: "Exported function from agent-team/src/core/locks.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/locks.mjs"
    symbol: "arbitrateClaims"
    line_start: "6"
    line_end: "15"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.locks.arbitrateclaims` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.locks.arbitrateclaims is the canonical typescript-function named arbitrateClaims.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/core/status-projection.mjs`
- `agent-team/tests/unit/locks.test.mjs`

## Invariants

The symbol is exported across its module boundary as `arbitrateClaims`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/locks.mjs:6-15` — arbitrateClaims

## Related Knowledge

- `belongs-to` → `project.agent-team`
