---
id: "component.backend.backend.src.routes.patient-intake.router"
kind: "typescript-constant"
title: "router"
status: "observed"
summary: "Exported constant from backend/src/routes/patient-intake.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-intake.ts"
    symbol: "router"
    line_start: "4"
    line_end: "4"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/routes/patient-intake.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.routes.patient-intake.router` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.patient-intake.router is the canonical typescript-constant named router.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/app.ts`

## Invariants

The symbol is exported across its module boundary as `router`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/patient-intake.ts:4-4` — router

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
