---
id: "component.backend.backend.src.ai.gateway.context.ispatientallowed"
kind: "typescript-function"
title: "isPatientAllowed"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/context.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/context.ts"
    symbol: "isPatientAllowed"
    line_start: "57"
    line_end: "60"
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

What does `component.backend.backend.src.ai.gateway.context.ispatientallowed` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.context.ispatientallowed is the canonical typescript-function named isPatientAllowed.

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

## Invariants

The symbol is exported across its module boundary as `isPatientAllowed`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/context.ts:57-60` — isPatientAllowed

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
