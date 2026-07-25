---
id: 'component.agent-team.agent-team.src.core.worker-policy.nested-agent-tools'
kind: 'typescript-constant'
title: 'NESTED_AGENT_TOOLS'
status: 'observed'
summary: 'Exported constant from agent-team/src/core/worker-policy.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'agent-team/src/core/worker-policy.mjs'
    symbol: 'NESTED_AGENT_TOOLS'
    line_start: '9'
    line_end: '9'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.agent-team'
    evidence: 'agent-team/src/core/worker-policy.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.agent-team.agent-team.src.core.worker-policy.nested-agent-tools` represent in ClinicOS?

## Canonical Definition

component.agent-team.agent-team.src.core.worker-policy.nested-agent-tools is the canonical typescript-constant named NESTED_AGENT_TOOLS.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.agent-team`.

## Side Effects

None observed

## Consumers

- `agent-team/tests/unit/worker-policy.test.mjs`

## Invariants

The symbol is exported across its module boundary as `NESTED_AGENT_TOOLS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `agent-team/src/core/worker-policy.mjs:9-9` — NESTED_AGENT_TOOLS

## Related Knowledge

- `belongs-to` → `project.agent-team`
