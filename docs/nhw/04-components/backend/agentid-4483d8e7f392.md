---
id: 'component.backend.backend.src.ai.assistant.agents.agentid'
kind: 'typescript-type-alias'
title: 'AgentId'
status: 'observed'
summary: 'Exported type-alias from backend/src/ai/assistant/agents.ts.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'backend/src/ai/assistant/agents.ts'
    symbol: 'AgentId'
    line_start: '8'
    line_end: '8'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/assistant/agents.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'type-alias'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.agents.agentid` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.agents.agentid is the canonical typescript-type-alias named AgentId.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/orchestrate.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `AgentId`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/agents.ts:8-8` — AgentId

## Related Knowledge

- `belongs-to` → `project.backend`
