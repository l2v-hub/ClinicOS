---
id: "component.backend.backend.src.ai.gateway.types.sourcereference"
kind: "typescript-interface"
title: "SourceReference"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/types.ts"
    symbol: "SourceReference"
    line_start: "20"
    line_end: "30"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.types.sourcereference` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.types.sourcereference is the canonical typescript-interface named SourceReference.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/assistant/composer.ts`
- `backend/src/ai/assistant/runtime-client.ts`
- `backend/src/ai/assistant/service.ts`
- `backend/src/ai/gateway/query/engine.ts`
- `backend/src/ai/gateway/services.ts`
- `backend/src/ai/gateway/sources.ts`

## Invariants

The symbol is exported across its module boundary as `SourceReference`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/types.ts:20-30` — SourceReference

## Related Knowledge

- `belongs-to` → `project.backend`
