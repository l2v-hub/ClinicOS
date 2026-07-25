---
id: 'component.agent-team.agent-team.src.core.history.parseprotocolcomments'
kind: 'typescript-function'
title: 'parseProtocolComments'
status: 'observed'
summary: 'Exported function from agent-team/src/core/history.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'agent-team/src/core/history.mjs'
    symbol: 'parseProtocolComments'
    line_start: '7'
    line_end: '21'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.agent-team'
    evidence: 'agent-team/src/core/history.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.agent-team.agent-team.src.core.history.parseprotocolcomments` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.history.parseprotocolcomments is the canonical typescript-function named parseProtocolComments.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/core/status-projection.mjs`
- `agent-team/tests/unit/history.test.mjs`

## Invariants

The symbol is exported across its module boundary as `parseProtocolComments`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/history.mjs:7-21` — parseProtocolComments

## Related Knowledge

- `belongs-to` → `project.agent-team`
