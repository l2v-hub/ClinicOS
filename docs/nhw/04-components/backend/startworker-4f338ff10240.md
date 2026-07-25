---
id: "component.backend.backend.src.ai.upload.worker.startworker"
kind: "typescript-function"
title: "startWorker"
status: "observed"
summary: "Exported function from backend/src/ai/upload/worker.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/worker.ts"
    symbol: "startWorker"
    line_start: "59"
    line_end: "74"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.worker.startworker` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.worker.startworker is the canonical typescript-function named startWorker.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/server.ts`

## Invariants

The symbol is exported across its module boundary as `startWorker`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/worker.ts:59-74` — startWorker

## Related Knowledge

- `belongs-to` → `project.backend`
