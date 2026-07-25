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
    target: "project.backend"
    evidence: "backend/src/ai/gateway/query/patient-scope.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
