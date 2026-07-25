---
id: "component.backend.backend.src.ai.gateway.query.patient-scope.resolvepatientfilter"
kind: "typescript-function"
title: "resolvePatientFilter"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/query/patient-scope.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/query/patient-scope.ts"
    symbol: "resolvePatientFilter"
    line_start: "9"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/query/patient-scope.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.patient-scope.resolvepatientfilter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.patient-scope.resolvepatientfilter is the canonical typescript-function named resolvePatientFilter.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/query/engine.ts`

## Invariants

The symbol is exported across its module boundary as `resolvePatientFilter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/patient-scope.ts:9-21` — resolvePatientFilter

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
