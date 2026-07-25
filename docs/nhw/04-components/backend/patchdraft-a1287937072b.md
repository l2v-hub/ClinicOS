---
id: "component.backend.backend.src.intake.draft-service.patchdraft"
kind: "typescript-function"
title: "patchDraft"
status: "observed"
summary: "Exported function from backend/src/intake/draft-service.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/intake/draft-service.ts"
    symbol: "patchDraft"
    line_start: "63"
    line_end: "73"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.intake.draft-service.patchdraft` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.draft-service.patchdraft is the canonical typescript-function named patchDraft.

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
- `backend/src/routes/intake-drafts.ts`

## Invariants

The symbol is exported across its module boundary as `patchDraft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/draft-service.ts:63-73` — patchDraft

## Related Knowledge

- `belongs-to` → `project.backend`
