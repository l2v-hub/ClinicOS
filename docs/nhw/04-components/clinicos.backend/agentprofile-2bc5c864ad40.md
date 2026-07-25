---
id: "component.backend.backend.src.ai.assistant.agents.agentprofile"
kind: "typescript-interface"
title: "AgentProfile"
status: "observed"
summary: "Exported interface from backend/src/ai/assistant/agents.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/agents.ts"
    symbol: "AgentProfile"
    line_start: "40"
    line_end: "46"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/assistant/agents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.agents.agentprofile` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.agents.agentprofile is the canonical typescript-interface named AgentProfile.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `AgentProfile`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/agents.ts:40-46` — AgentProfile

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
