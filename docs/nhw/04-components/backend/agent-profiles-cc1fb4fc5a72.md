---
id: "component.backend.backend.src.ai.assistant.agents.agent-profiles"
kind: "typescript-constant"
title: "AGENT_PROFILES"
status: "observed"
summary: "Exported constant from backend/src/ai/assistant/agents.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/agents.ts"
    symbol: "AGENT_PROFILES"
    line_start: "48"
    line_end: "63"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/agents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.agents.agent-profiles` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.agents.agent-profiles is the canonical typescript-constant named AGENT_PROFILES.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/agents.test.ts`

## Invariants

The symbol is exported across its module boundary as `AGENT_PROFILES`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/agents.ts:48-63` — AGENT_PROFILES

## Related Knowledge

- `belongs-to` → `project.backend`
