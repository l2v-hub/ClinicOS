---
id: "component.backend.backend.src.ai.assistant.agents.agentallowsintent"
kind: "typescript-function"
title: "agentAllowsIntent"
status: "observed"
summary: "Exported function from backend/src/ai/assistant/agents.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/agents.ts"
    symbol: "agentAllowsIntent"
    line_start: "77"
    line_end: "79"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/agents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.agents.agentallowsintent` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.agents.agentallowsintent is the canonical typescript-function named agentAllowsIntent.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/agents.test.ts`
- `backend/src/ai/__tests__/staff-list.test.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `agentAllowsIntent`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/agents.ts:77-79` — agentAllowsIntent

## Related Knowledge

- `belongs-to` → `project.backend`
