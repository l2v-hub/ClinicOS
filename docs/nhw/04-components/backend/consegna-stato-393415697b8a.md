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
    target: "project.backend"
    evidence: "backend/src/services/consegna-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
