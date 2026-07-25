---
id: "component.frontend.frontend.src.components.operator.cartella.clinicaltable.clinicaltable"
kind: "typescript-react-component"
title: "ClinicalTable"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/ClinicalTable.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/ClinicalTable.tsx"
    symbol: "ClinicalTable"
    line_start: "82"
    line_end: "316"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/ClinicalTable.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.clinicaltable.clinicaltable` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.clinicaltable.clinicaltable is the canonical typescript-react-component named ClinicalTable.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/OperatorManagement.tsx`
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/operator/cartella/DimissioneTab.tsx`
- `frontend/src/components/operator/cartella/MedicazioniTab.tsx`
- `frontend/src/components/operator/cartella/ScalaBradenTab.tsx`
- `frontend/src/components/operator/cartella/ScalaNRSTab.tsx`
- `frontend/src/components/operator/cartella/ScalaTinettiTab.tsx`
- `frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx`

## Invariants

The symbol is exported across its module boundary as `ClinicalTable`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/ClinicalTable.tsx:82-316` — ClinicalTable

## Related Knowledge

- `belongs-to` → `project.frontend`
