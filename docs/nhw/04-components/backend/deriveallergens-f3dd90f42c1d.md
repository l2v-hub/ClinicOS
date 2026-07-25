---
id: "component.backend.backend.src.intake.draft-service.deriveallergens"
kind: "typescript-function"
title: "deriveAllergens"
status: "observed"
summary: "Exported function from backend/src/intake/draft-service.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/intake/draft-service.ts"
    symbol: "deriveAllergens"
    line_start: "27"
    line_end: "35"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.intake.draft-service.deriveallergens` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.draft-service.deriveallergens is the canonical typescript-function named deriveAllergens.

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

The symbol is exported across its module boundary as `deriveAllergens`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/draft-service.ts:27-35` — deriveAllergens

## Related Knowledge

- `belongs-to` → `project.backend`
