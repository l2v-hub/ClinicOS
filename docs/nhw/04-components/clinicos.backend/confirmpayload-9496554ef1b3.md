---
id: "component.backend.backend.src.ai.upload.confirm-service.confirmpayload"
kind: "typescript-interface"
title: "ConfirmPayload"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/confirm-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/confirm-service.ts"
    symbol: "ConfirmPayload"
    line_start: "52"
    line_end: "66"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/confirm-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.confirm-service.confirmpayload` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.confirm-service.confirmpayload is the canonical typescript-interface named ConfirmPayload.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/ai-jobs.ts`
- `backend/src/routes/intake-drafts.ts`

## Invariants

The symbol is exported across its module boundary as `ConfirmPayload`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/confirm-service.ts:52-66` — ConfirmPayload

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
