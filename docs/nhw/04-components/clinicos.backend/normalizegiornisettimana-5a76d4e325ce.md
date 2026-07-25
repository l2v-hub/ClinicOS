---
id: "component.backend.backend.src.therapies.therapy-create.normalizegiornisettimana"
kind: "typescript-function"
title: "normalizeGiorniSettimana"
status: "observed"
summary: "Exported function from backend/src/therapies/therapy-create.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/therapies/therapy-create.ts"
    symbol: "normalizeGiorniSettimana"
    line_start: "61"
    line_end: "68"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/therapies/therapy-create.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.therapies.therapy-create.normalizegiornisettimana` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.therapies.therapy-create.normalizegiornisettimana is the canonical typescript-function named normalizeGiorniSettimana.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/patient-therapies.ts`
- `backend/src/therapies/__tests__/giorni-settimana.test.ts`

## Invariants

The symbol is exported across its module boundary as `normalizeGiorniSettimana`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/therapies/therapy-create.ts:61-68` — normalizeGiorniSettimana

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
