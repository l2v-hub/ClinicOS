---
id: "component.backend.backend.src.services.consegna-service.consegna-priorita"
kind: "typescript-constant"
title: "CONSEGNA_PRIORITA"
status: "observed"
summary: "Exported constant from backend/src/services/consegna-service.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/services/consegna-service.ts"
    symbol: "CONSEGNA_PRIORITA"
    line_start: "7"
    line_end: "7"
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

What does `component.backend.backend.src.services.consegna-service.consegna-priorita` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.consegna-service.consegna-priorita is the canonical typescript-constant named CONSEGNA_PRIORITA.

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

The symbol is exported across its module boundary as `CONSEGNA_PRIORITA`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/consegna-service.ts:7-7` — CONSEGNA_PRIORITA

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
