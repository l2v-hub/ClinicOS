---
id: "component.backend.backend.src.intake.draft-service.isplausibleallergentext"
kind: "typescript-function"
title: "isPlausibleAllergenText"
status: "observed"
summary: "Exported function from backend/src/intake/draft-service.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/intake/draft-service.ts"
    symbol: "isPlausibleAllergenText"
    line_start: "17"
    line_end: "24"
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

What does `component.backend.backend.src.intake.draft-service.isplausibleallergentext` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.draft-service.isplausibleallergentext is the canonical typescript-function named isPlausibleAllergenText.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/intake/__tests__/seed-draft-from-import.test.ts`

## Invariants

The symbol is exported across its module boundary as `isPlausibleAllergenText`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/draft-service.ts:17-24` — isPlausibleAllergenText

## Related Knowledge

- `belongs-to` → `project.backend`
