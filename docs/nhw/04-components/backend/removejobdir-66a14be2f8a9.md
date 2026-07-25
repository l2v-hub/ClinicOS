---
id: "component.backend.backend.src.ai.upload.storage.removejobdir"
kind: "typescript-function"
title: "removeJobDir"
status: "observed"
summary: "Exported function from backend/src/ai/upload/storage.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/storage.ts"
    symbol: "removeJobDir"
    line_start: "37"
    line_end: "39"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/storage.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.storage.removejobdir` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.storage.removejobdir is the canonical typescript-function named removeJobDir.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/upload/job-service.ts`

## Invariants

The symbol is exported across its module boundary as `removeJobDir`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/storage.ts:37-39` — removeJobDir

## Related Knowledge

- `belongs-to` → `project.backend`
