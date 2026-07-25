---
id: 'component.agent-team.agent-team.src.core.locks.writeheartbeat'
kind: 'typescript-function'
title: 'writeHeartbeat'
status: 'observed'
summary: 'Exported function from agent-team/src/core/locks.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'agent-team/src/core/locks.mjs'
    symbol: 'writeHeartbeat'
    line_start: '173'
    line_end: '179'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.agent-team'
    evidence: 'agent-team/src/core/locks.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.agent-team.agent-team.src.core.locks.writeheartbeat` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.locks.writeheartbeat is the canonical typescript-function named writeHeartbeat.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/commands/start.mjs`

## Invariants

The symbol is exported across its module boundary as `writeHeartbeat`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/locks.mjs:173-179` — writeHeartbeat

## Related Knowledge

- `belongs-to` → `project.agent-team`
