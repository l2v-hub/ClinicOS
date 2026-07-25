---
id: "component.agent-team.agent-team.src.core.reconciler.reconcileonce"
kind: "typescript-function"
title: "reconcileOnce"
status: "observed"
summary: "Exported function from agent-team/src/core/reconciler.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/reconciler.mjs"
    symbol: "reconcileOnce"
    line_start: "1"
    line_end: "29"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.reconciler.reconcileonce` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.reconciler.reconcileonce is the canonical typescript-function named reconcileOnce.

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
- `agent-team/tests/integration/remediation-loop.test.mjs`
- `agent-team/tests/integration/supervisor.test.mjs`
- `agent-team/tests/unit/claim-worktree-authority.test.mjs`
- `agent-team/tests/unit/lease-heartbeat.test.mjs`

## Invariants

The symbol is exported across its module boundary as `reconcileOnce`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/reconciler.mjs:1-29` — reconcileOnce

## Related Knowledge

- `belongs-to` → `project.agent-team`
