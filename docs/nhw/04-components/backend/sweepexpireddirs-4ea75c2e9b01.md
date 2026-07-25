---
id: "component.backend.backend.src.ai.upload.storage.sweepexpireddirs"
kind: "typescript-function"
title: "sweepExpiredDirs"
status: "observed"
summary: "Exported function from backend/src/ai/upload/storage.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/storage.ts"
    symbol: "sweepExpiredDirs"
    line_start: "42"
    line_end: "67"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.storage.sweepexpireddirs` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.storage.sweepexpireddirs is the canonical typescript-function named sweepExpiredDirs.

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

The symbol is exported across its module boundary as `sweepExpiredDirs`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/storage.ts:42-67` — sweepExpiredDirs

## Related Knowledge

- `belongs-to` → `project.backend`
