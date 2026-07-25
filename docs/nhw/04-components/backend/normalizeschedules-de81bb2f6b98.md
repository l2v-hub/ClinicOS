---
id: "component.backend.backend.src.lib.therapy-dose.normalizeschedules"
kind: "typescript-function"
title: "normalizeSchedules"
status: "observed"
summary: "Exported function from backend/src/lib/therapy-dose.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/lib/therapy-dose.ts"
    symbol: "normalizeSchedules"
    line_start: "139"
    line_end: "166"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/lib/therapy-dose.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.lib.therapy-dose.normalizeschedules` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.therapy-dose.normalizeschedules is the canonical typescript-function named normalizeSchedules.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/therapy-dose.test.ts`
- `backend/src/routes/patient-therapies.ts`
- `backend/src/therapies/therapy-create.ts`

## Invariants

The symbol is exported across its module boundary as `normalizeSchedules`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/therapy-dose.ts:139-166` — normalizeSchedules

## Related Knowledge

- `belongs-to` → `project.backend`
