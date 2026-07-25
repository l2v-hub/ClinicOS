---
id: "component.backend.backend.src.lib.codice-fiscale.isvalidcodicefiscale"
kind: "typescript-function"
title: "isValidCodiceFiscale"
status: "observed"
summary: "Exported function from backend/src/lib/codice-fiscale.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/lib/codice-fiscale.ts"
    symbol: "isValidCodiceFiscale"
    line_start: "101"
    line_end: "105"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/lib/codice-fiscale.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.lib.codice-fiscale.isvalidcodicefiscale` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.codice-fiscale.isvalidcodicefiscale is the canonical typescript-function named isValidCodiceFiscale.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/codice-fiscale.test.ts`
- `backend/src/ai/upload/confirm-service.ts`
- `backend/src/routes/patients.ts`

## Invariants

The symbol is exported across its module boundary as `isValidCodiceFiscale`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/codice-fiscale.ts:101-105` — isValidCodiceFiscale

## Related Knowledge

- `belongs-to` → `project.backend`
