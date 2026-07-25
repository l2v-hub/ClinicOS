---
id: "component.backend.backend.src.ai.gateway.filters.matchtherapy"
kind: "typescript-function"
title: "matchTherapy"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/filters.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/ai/gateway/filters.ts"
    symbol: "matchTherapy"
    line_start: "110"
    line_end: "113"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/filters.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.filters.matchtherapy` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.filters.matchtherapy is the canonical typescript-function named matchTherapy.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/gateway.test.ts`
- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `matchTherapy`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/filters.ts:110-113` — matchTherapy

## Related Knowledge

- `belongs-to` → `project.backend`
