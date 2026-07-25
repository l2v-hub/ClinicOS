---
id: "component.backend.backend.src.ai.gateway.context.cancrosspatientsearch"
kind: "typescript-function"
title: "canCrossPatientSearch"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/context.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/context.ts"
    symbol: "canCrossPatientSearch"
    line_start: "69"
    line_end: "76"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/context.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.context.cancrosspatientsearch` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.context.cancrosspatientsearch is the canonical typescript-function named canCrossPatientSearch.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/gateway.test.ts`
- `backend/src/ai/__tests__/security.test.ts`
- `backend/src/ai/assistant/service.ts`
- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `canCrossPatientSearch`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/context.ts:69-76` — canCrossPatientSearch

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
