---
id: "component.frontend.frontend.src.components.operator.cartella.medicazionitab.medicazionitab"
kind: "typescript-react-component"
title: "MedicazioniTab"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/MedicazioniTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/MedicazioniTab.tsx"
    symbol: "MedicazioniTab"
    line_start: "688"
    line_end: "1151"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/MedicazioniTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.medicazionitab.medicazionitab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.medicazionitab.medicazionitab is the canonical typescript-react-component named MedicazioniTab.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `MedicazioniTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/MedicazioniTab.tsx:688-1151` — MedicazioniTab

## Related Knowledge

- `belongs-to` → `project.frontend`
