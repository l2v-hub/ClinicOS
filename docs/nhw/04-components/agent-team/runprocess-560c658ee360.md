---
id: "component.agent-team.agent-team.src.adapters.process-runner.runprocess"
kind: "typescript-function"
title: "runProcess"
status: "observed"
summary: "Exported function from agent-team/src/adapters/process-runner.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/adapters/process-runner.mjs"
    symbol: "runProcess"
    line_start: "63"
    line_end: "171"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/adapters/process-runner.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.agent-team.agent-team.src.adapters.process-runner.runprocess` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.adapters.process-runner.runprocess is the canonical typescript-function named runProcess.

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
- `agent-team/tests/fixtures/exit-orphan-host.mjs`
- `agent-team/tests/integration/evidence-binding.test.mjs`
- `agent-team/tests/unit/process-runner.test.mjs`

## Invariants

The symbol is exported across its module boundary as `runProcess`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/adapters/process-runner.mjs:63-171` — runProcess

## Related Knowledge

- `belongs-to` → `project.agent-team`
