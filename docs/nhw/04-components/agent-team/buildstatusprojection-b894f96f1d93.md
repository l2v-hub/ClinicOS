---
id: "component.agent-team.agent-team.src.core.status-projection.buildstatusprojection"
kind: "typescript-function"
title: "buildStatusProjection"
status: "observed"
summary: "Exported function from agent-team/src/core/status-projection.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/status-projection.mjs"
    symbol: "buildStatusProjection"
    line_start: "5"
    line_end: "74"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/status-projection.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.status-projection.buildstatusprojection` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.status-projection.buildstatusprojection is the canonical typescript-function named buildStatusProjection.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/commands/status.mjs`
- `agent-team/tests/integration/remediation-loop.test.mjs`
- `agent-team/tests/integration/supervisor-lifecycle.test.mjs`

## Invariants

The symbol is exported across its module boundary as `buildStatusProjection`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/status-projection.mjs:5-74` — buildStatusProjection

## Related Knowledge

- `belongs-to` → `project.agent-team`
