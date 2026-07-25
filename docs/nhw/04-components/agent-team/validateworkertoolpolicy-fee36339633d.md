---
id: "component.agent-team.agent-team.src.core.worker-policy.validateworkertoolpolicy"
kind: "typescript-function"
title: "validateWorkerToolPolicy"
status: "observed"
summary: "Exported function from agent-team/src/core/worker-policy.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/core/worker-policy.mjs"
    symbol: "validateWorkerToolPolicy"
    line_start: "27"
    line_end: "70"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/core/worker-policy.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.agent-team.agent-team.src.core.worker-policy.validateworkertoolpolicy` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.worker-policy.validateworkertoolpolicy is the canonical typescript-function named validateWorkerToolPolicy.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/commands/doctor.mjs`
- `agent-team/src/core/config.mjs`
- `agent-team/tests/unit/worker-policy.test.mjs`

## Invariants

The symbol is exported across its module boundary as `validateWorkerToolPolicy`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/worker-policy.mjs:27-70` — validateWorkerToolPolicy

## Related Knowledge

- `belongs-to` → `project.agent-team`
