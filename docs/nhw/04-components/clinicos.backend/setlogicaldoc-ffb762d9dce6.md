---
id: "component.backend.backend.src.ai.upload.job-service.setlogicaldoc"
kind: "typescript-function"
title: "setLogicalDoc"
status: "observed"
summary: "Exported function from backend/src/ai/upload/job-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/job-service.ts"
    symbol: "setLogicalDoc"
    line_start: "586"
    line_end: "596"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/job-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.job-service.setlogicaldoc` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.job-service.setlogicaldoc is the canonical typescript-function named setLogicalDoc.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-jobs.ts`

## Invariants

The symbol is exported across its module boundary as `setLogicalDoc`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:586-596` — setLogicalDoc

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
