---
id: "component.backend.backend.src.ai.upload.validation.accepted-extensions"
kind: "typescript-constant"
title: "ACCEPTED_EXTENSIONS"
status: "observed"
summary: "Exported constant from backend/src/ai/upload/validation.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/validation.ts"
    symbol: "ACCEPTED_EXTENSIONS"
    line_start: "10"
    line_end: "22"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/validation.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.validation.accepted-extensions` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.validation.accepted-extensions is the canonical typescript-constant named ACCEPTED_EXTENSIONS.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/upload.test.ts`

## Invariants

The symbol is exported across its module boundary as `ACCEPTED_EXTENSIONS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/validation.ts:10-22` — ACCEPTED_EXTENSIONS

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
