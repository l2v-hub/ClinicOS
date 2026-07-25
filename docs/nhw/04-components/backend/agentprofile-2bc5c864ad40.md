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
    target: "project.backend"
    evidence: "backend/src/ai/assistant/agents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
