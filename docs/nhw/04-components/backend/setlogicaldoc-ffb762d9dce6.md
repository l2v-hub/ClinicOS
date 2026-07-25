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
    line_start: "630"
    line_end: "640"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
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

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-jobs.ts`

## Invariants

The symbol is exported across its module boundary as `setLogicalDoc`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/job-service.ts:630-640` — setLogicalDoc

## Related Knowledge

- `belongs-to` → `project.backend`
