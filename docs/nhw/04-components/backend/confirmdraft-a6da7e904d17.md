---
id: "component.backend.backend.src.ai.upload.confirm-service.confirmdraft"
kind: "typescript-function"
title: "confirmDraft"
status: "observed"
summary: "Exported function from backend/src/ai/upload/confirm-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/confirm-service.ts"
    symbol: "confirmDraft"
    line_start: "173"
    line_end: "330"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/confirm-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.confirm-service.confirmdraft` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.confirm-service.confirmdraft is the canonical typescript-function named confirmDraft.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/intake-confirm.test.ts`
- `backend/src/intake/__tests__/confirm-draft-guards.test.ts`
- `backend/src/intake/__tests__/confirm-draft-therapy.test.ts`
- `backend/src/routes/intake-drafts.ts`

## Invariants

The symbol is exported across its module boundary as `confirmDraft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/confirm-service.ts:173-330` — confirmDraft

## Related Knowledge

- `belongs-to` → `project.backend`
