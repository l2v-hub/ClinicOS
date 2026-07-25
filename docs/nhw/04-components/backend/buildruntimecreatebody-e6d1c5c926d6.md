---
id: "component.backend.backend.src.ai.upload.job-service.buildruntimecreatebody"
kind: "typescript-function"
title: "buildRuntimeCreateBody"
status: "observed"
summary: "Exported function from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "buildRuntimeCreateBody"
    line_start: "124"
    line_end: "141"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/job-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.buildruntimecreatebody` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.buildruntimecreatebody is the canonical typescript-function named buildRuntimeCreateBody.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/runtime-contract.test.ts`

## Invariants

The symbol is exported across its module boundary as `buildRuntimeCreateBody`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:124-141` — buildRuntimeCreateBody

## Related Knowledge

- `belongs-to` → `project.backend`
