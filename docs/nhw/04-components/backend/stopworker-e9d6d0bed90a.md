---
id: "component.backend.backend.src.ai.upload.worker.stopworker"
kind: "typescript-function"
title: "stopWorker"
status: "observed"
summary: "Exported function from backend/src/ai/upload/worker.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/worker.ts"
    symbol: "stopWorker"
    line_start: "76"
    line_end: "81"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.worker.stopworker` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.worker.stopworker is the canonical typescript-function named stopWorker.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `stopWorker`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/worker.ts:76-81` — stopWorker

## Related Knowledge

- `belongs-to` → `project.backend`
