---
id: 'component.agent-team.agent-team.src.core.protocol.parseprotocolcomment'
kind: 'typescript-function'
title: 'parseProtocolComment'
status: 'observed'
summary: 'Exported function from agent-team/src/core/protocol.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'agent-team/src/core/protocol.mjs'
    symbol: 'parseProtocolComment'
    line_start: '13'
    line_end: '18'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.agent-team'
    evidence: 'agent-team/src/core/protocol.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.agent-team.agent-team.src.core.protocol.parseprotocolcomment` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.protocol.parseprotocolcomment is the canonical typescript-function named parseProtocolComment.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/src/core/locks.mjs`
- `agent-team/tests/integration/remediation-loop.test.mjs`
- `agent-team/tests/unit/claim-lifecycle.test.mjs`
- `agent-team/tests/unit/claim-worktree-authority.test.mjs`
- `agent-team/tests/unit/protocol.test.mjs`

## Invariants

The symbol is exported across its module boundary as `parseProtocolComment`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/protocol.mjs:13-18` — parseProtocolComment

## Related Knowledge

- `belongs-to` → `project.agent-team`
