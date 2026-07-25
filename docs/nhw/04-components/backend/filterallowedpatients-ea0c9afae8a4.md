---
id: "component.backend.backend.src.ai.gateway.context.filterallowedpatients"
kind: "typescript-function"
title: "filterAllowedPatients"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/context.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/context.ts"
    symbol: "filterAllowedPatients"
    line_start: "86"
    line_end: "88"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/context.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.context.filterallowedpatients` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.context.filterallowedpatients is the canonical typescript-function named filterAllowedPatients.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `filterAllowedPatients`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/context.ts:86-88` — filterAllowedPatients

## Related Knowledge

- `belongs-to` → `project.backend`
