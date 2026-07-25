---
id: "component.backend.backend.src.intake.draft-service.listdrafts"
kind: "typescript-function"
title: "listDrafts"
status: "observed"
summary: "Exported function from backend/src/intake/draft-service.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/intake/draft-service.ts"
    symbol: "listDrafts"
    line_start: "75"
    line_end: "83"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.intake.draft-service.listdrafts` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.draft-service.listdrafts is the canonical typescript-function named listDrafts.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/intake-drafts.ts`

## Invariants

The symbol is exported across its module boundary as `listDrafts`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/draft-service.ts:75-83` — listDrafts

## Related Knowledge

- `belongs-to` → `project.backend`
