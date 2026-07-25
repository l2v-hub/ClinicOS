---
id: "component.backend.backend.src.ai.upload.job-service.mapruntimestatus"
kind: "typescript-function"
title: "mapRuntimeStatus"
status: "observed"
summary: "Exported function from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "mapRuntimeStatus"
    line_start: "423"
    line_end: "442"
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

What does `component.backend.backend.src.ai.upload.job-service.mapruntimestatus` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.mapruntimestatus is the canonical typescript-function named mapRuntimeStatus.

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

The symbol is exported across its module boundary as `mapRuntimeStatus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:423-442` — mapRuntimeStatus

## Related Knowledge

- `belongs-to` → `project.backend`
