---
id: "component.backend.backend.src.routes.patient-documents.sniffallowedmime"
kind: "typescript-function"
title: "sniffAllowedMime"
status: "observed"
summary: "Exported function from backend/src/routes/patient-documents.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-documents.ts"
    symbol: "sniffAllowedMime"
    line_start: "121"
    line_end: "150"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/routes/patient-documents.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.routes.patient-documents.sniffallowedmime` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.patient-documents.sniffallowedmime is the canonical typescript-function named sniffAllowedMime.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/patient-documents-security.test.ts`

## Invariants

The symbol is exported across its module boundary as `sniffAllowedMime`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/patient-documents.ts:121-150` — sniffAllowedMime

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
