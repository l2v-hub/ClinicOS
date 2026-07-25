---
id: "component.backend.backend.src.services.consegna-service.consegna-stato"
kind: "typescript-constant"
title: "CONSEGNA_STATO"
status: "observed"
summary: "Exported constant from backend/src/services/consegna-service.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/services/consegna-service.ts"
    symbol: "CONSEGNA_STATO"
    line_start: "8"
    line_end: "8"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/services/consegna-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.services.consegna-service.consegna-stato` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.consegna-service.consegna-stato is the canonical typescript-constant named CONSEGNA_STATO.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/consegne.ts`

## Invariants

The symbol is exported across its module boundary as `CONSEGNA_STATO`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/consegna-service.ts:8-8` — CONSEGNA_STATO

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
