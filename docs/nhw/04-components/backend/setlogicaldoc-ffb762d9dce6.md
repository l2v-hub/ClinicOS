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
    target: "project.backend"
    evidence: "backend/src/ai/upload/job-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
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

- `backend/src/ai/upload/job-service.ts:586-596` — setLogicalDoc

## Related Knowledge

- `belongs-to` → `project.backend`
