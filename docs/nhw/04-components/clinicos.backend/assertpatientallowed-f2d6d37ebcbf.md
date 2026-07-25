---
id: "component.backend.backend.src.ai.gateway.context.assertpatientallowed"
kind: "typescript-function"
title: "assertPatientAllowed"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/context.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/context.ts"
    symbol: "assertPatientAllowed"
    line_start: "63"
    line_end: "66"
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

What does `component.backend.backend.src.ai.gateway.context.assertpatientallowed` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.context.assertpatientallowed is the canonical typescript-function named assertPatientAllowed.

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
- `backend/src/ai/gateway/query/engine.ts`
- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `assertPatientAllowed`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/context.ts:63-66` — assertPatientAllowed

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
