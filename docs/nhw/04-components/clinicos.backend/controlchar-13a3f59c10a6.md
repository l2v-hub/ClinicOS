---
id: "component.backend.backend.src.lib.codice-fiscale.controlchar"
kind: "typescript-function"
title: "controlChar"
status: "observed"
summary: "Exported function from backend/src/lib/codice-fiscale.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/lib/codice-fiscale.ts"
    symbol: "controlChar"
    line_start: "92"
    line_end: "99"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/lib/codice-fiscale.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.lib.codice-fiscale.controlchar` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.codice-fiscale.controlchar is the canonical typescript-function named controlChar.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/codice-fiscale.test.ts`

## Invariants

The symbol is exported across its module boundary as `controlChar`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/codice-fiscale.ts:92-99` — controlChar

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
