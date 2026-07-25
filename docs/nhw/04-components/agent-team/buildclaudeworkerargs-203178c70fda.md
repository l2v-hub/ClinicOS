---
id: 'component.agent-team.agent-team.src.core.worker-policy.buildclaudeworkerargs'
kind: 'typescript-function'
title: 'buildClaudeWorkerArgs'
status: 'observed'
summary: 'Exported function from agent-team/src/core/worker-policy.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'agent-team/src/core/worker-policy.mjs'
    symbol: 'buildClaudeWorkerArgs'
    line_start: '74'
    line_end: '90'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.agent-team'
    evidence: 'agent-team/src/core/worker-policy.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.agent-team.agent-team.src.core.worker-policy.buildclaudeworkerargs` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.worker-policy.buildclaudeworkerargs is the canonical typescript-function named buildClaudeWorkerArgs.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/workers/claude-development-worker.mjs`
- `agent-team/tests/unit/worker-policy.test.mjs`

## Invariants

The symbol is exported across its module boundary as `buildClaudeWorkerArgs`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/worker-policy.mjs:74-90` — buildClaudeWorkerArgs

## Related Knowledge

- `belongs-to` → `project.agent-team`
