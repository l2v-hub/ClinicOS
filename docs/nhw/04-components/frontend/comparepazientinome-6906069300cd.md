---
id: "component.frontend.frontend.src.lib.patientsort.comparepazientinome"
kind: "typescript-function"
title: "comparePazientiNome"
status: "observed"
summary: "Exported function from frontend/src/lib/patientSort.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "frontend/src/lib/patientSort.ts"
    symbol: "comparePazientiNome"
    line_start: "36"
    line_end: "45"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/patientSort.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.frontend.frontend.src.lib.patientsort.comparepazientinome` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.patientsort.comparepazientinome is the canonical typescript-function named comparePazientiNome.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/ConsegnePage.tsx`

## Invariants

The symbol is exported across its module boundary as `comparePazientiNome`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/patientSort.ts:36-45` — comparePazientiNome

## Related Knowledge

- `belongs-to` → `project.frontend`
