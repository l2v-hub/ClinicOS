---
id: "component.backend.backend.src.ai.gateway.types.correlateinput"
kind: "typescript-interface"
title: "CorrelateInput"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/types.ts"
    symbol: "CorrelateInput"
    line_start: "93"
    line_end: "98"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.types.correlateinput` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.types.correlateinput is the canonical typescript-interface named CorrelateInput.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `CorrelateInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/types.ts:93-98` — CorrelateInput

## Related Knowledge

- `belongs-to` → `project.backend`
