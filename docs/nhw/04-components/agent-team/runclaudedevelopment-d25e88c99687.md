---
id: "component.agent-team.agent-team.src.workers.claude-development-worker.runclaudedevelopment"
kind: "typescript-function"
title: "runClaudeDevelopment"
status: "observed"
summary: "Exported function from agent-team/src/workers/claude-development-worker.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/workers/claude-development-worker.mjs"
    symbol: "runClaudeDevelopment"
    line_start: "8"
    line_end: "89"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/workers/claude-development-worker.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.agent-team.agent-team.src.workers.claude-development-worker.runclaudedevelopment` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.workers.claude-development-worker.runclaudedevelopment is the canonical typescript-function named runClaudeDevelopment.

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
- `agent-team/tests/unit/claude-development-worker.test.mjs`
- `agent-team/tests/unit/lease-heartbeat.test.mjs`
- `agent-team/tests/unit/worker-operability.test.mjs`

## Invariants

The symbol is exported across its module boundary as `runClaudeDevelopment`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/workers/claude-development-worker.mjs:8-89` — runClaudeDevelopment

## Related Knowledge

- `belongs-to` → `project.agent-team`
