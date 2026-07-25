---
id: "component.agent-team.agent-team.src.core.history.rebuildremediationcontext"
kind: "typescript-function"
title: "rebuildRemediationContext"
status: "observed"
summary: "Exported function from agent-team/src/core/history.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/history.mjs"
    symbol: "rebuildRemediationContext"
    line_start: "23"
    line_end: "58"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/history.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.history.rebuildremediationcontext` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.history.rebuildremediationcontext is the canonical typescript-function named rebuildRemediationContext.

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
- `agent-team/src/runtime.mjs`
- `agent-team/tests/unit/history.test.mjs`

## Invariants

The symbol is exported across its module boundary as `rebuildRemediationContext`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/history.mjs:23-58` — rebuildRemediationContext

## Related Knowledge

- `belongs-to` → `project.agent-team`
