---
id: "component.agent-team.agent-team.src.core.reconciler.reconciliationoutcome"
kind: "typescript-function"
title: "reconciliationOutcome"
status: "observed"
summary: "Exported function from agent-team/src/core/reconciler.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/reconciler.mjs"
    symbol: "reconciliationOutcome"
    line_start: "33"
    line_end: "37"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/reconciler.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.reconciler.reconciliationoutcome` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.reconciler.reconciliationoutcome is the canonical typescript-function named reconciliationOutcome.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/commands/once.mjs`
- `agent-team/tests/integration/once-failure-reporting.test.mjs`

## Invariants

The symbol is exported across its module boundary as `reconciliationOutcome`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/reconciler.mjs:33-37` — reconciliationOutcome

## Related Knowledge

- `belongs-to` → `project.agent-team`
