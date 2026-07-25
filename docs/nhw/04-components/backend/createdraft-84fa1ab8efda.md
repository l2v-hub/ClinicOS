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
    target: "project.backend"
    evidence: "backend/src/intake/draft-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
