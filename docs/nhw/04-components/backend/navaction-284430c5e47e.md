---
id: "component.backend.backend.src.ai.assistant.service.navaction"
kind: "typescript-interface"
title: "NavAction"
status: "observed"
summary: "Exported interface from backend/src/ai/assistant/service.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/assistant/service.ts"
    symbol: "NavAction"
    line_start: "27"
    line_end: "35"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/assistant/service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.service.navaction` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.service.navaction is the canonical typescript-interface named NavAction.

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

The symbol is exported across its module boundary as `NavAction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/service.ts:27-35` — NavAction

## Related Knowledge

- `belongs-to` → `project.backend`
