---
id: "component.backend.backend.src.intake.draft-service.createdraft"
kind: "typescript-function"
title: "createDraft"
status: "observed"
summary: "Exported function from backend/src/intake/draft-service.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/intake/draft-service.ts"
    symbol: "createDraft"
    line_start: "47"
    line_end: "57"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/intake/draft-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.intake.draft-service.createdraft` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.draft-service.createdraft is the canonical typescript-function named createDraft.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/intake-confirm.test.ts`
- `backend/src/ai/__tests__/intake-draft.test.ts`
- `backend/src/intake/__tests__/confirm-draft-therapy.test.ts`
- `backend/src/routes/intake-drafts.ts`

## Invariants

The symbol is exported across its module boundary as `createDraft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/draft-service.ts:47-57` — createDraft

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
