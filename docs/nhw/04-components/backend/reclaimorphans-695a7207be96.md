---
id: "component.backend.backend.src.ai.upload.worker.reclaimorphans"
kind: "typescript-function"
title: "reclaimOrphans"
status: "observed"
summary: "Exported function from backend/src/ai/upload/worker.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/worker.ts"
    symbol: "reclaimOrphans"
    line_start: "51"
    line_end: "57"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/worker.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.worker.reclaimorphans` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.worker.reclaimorphans is the canonical typescript-function named reclaimOrphans.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `e2e/async-smoke.mjs`

## Invariants

The symbol is exported across its module boundary as `reclaimOrphans`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/worker.ts:51-57` — reclaimOrphans

## Related Knowledge

- `belongs-to` → `project.backend`
