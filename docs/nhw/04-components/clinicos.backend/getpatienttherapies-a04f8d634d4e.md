---
id: "component.backend.backend.src.ai.gateway.services.getpatienttherapies"
kind: "typescript-function"
title: "getPatientTherapies"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/services.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/services.ts"
    symbol: "getPatientTherapies"
    line_start: "261"
    line_end: "283"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/services.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.services.getpatienttherapies` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.services.getpatienttherapies is the canonical typescript-function named getPatientTherapies.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `getPatientTherapies`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/services.ts:261-283` — getPatientTherapies

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
