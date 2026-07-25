---
id: 'component.agent-team.agent-team.src.core.remediation.nextremediationstate'
kind: 'typescript-function'
title: 'nextRemediationState'
status: 'observed'
summary: 'Exported function from agent-team/src/core/remediation.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'agent-team/src/core/remediation.mjs'
    symbol: 'nextRemediationState'
    line_start: '1'
    line_end: '11'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.agent-team'
    evidence: 'agent-team/src/core/remediation.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.agent-team.agent-team.src.core.remediation.nextremediationstate` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.remediation.nextremediationstate is the canonical typescript-function named nextRemediationState.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/core/history.mjs`
- `agent-team/tests/unit/remediation.test.mjs`

## Invariants

The symbol is exported across its module boundary as `nextRemediationState`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/remediation.mjs:1-11` — nextRemediationState

## Related Knowledge

- `belongs-to` → `project.agent-team`
