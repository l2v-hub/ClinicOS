---
id: "component.agent-team.agent-team.src.workers.codex-qa-worker.runcodexqa"
kind: "typescript-function"
title: "runCodexQa"
status: "observed"
summary: "Exported function from agent-team/src/workers/codex-qa-worker.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "agent-team/src/workers/codex-qa-worker.mjs"
    symbol: "runCodexQa"
    line_start: "5"
    line_end: "74"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.agent-team"
    evidence: "agent-team/src/workers/codex-qa-worker.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.agent-team.agent-team.src.workers.codex-qa-worker.runcodexqa` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.workers.codex-qa-worker.runcodexqa is the canonical typescript-function named runCodexQa.

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
- `agent-team/tests/unit/codex-qa-worker.test.mjs`
- `agent-team/tests/unit/worker-operability.test.mjs`

## Invariants

The symbol is exported across its module boundary as `runCodexQa`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/workers/codex-qa-worker.mjs:5-74` — runCodexQa

## Related Knowledge

- `belongs-to` → `project.agent-team`
