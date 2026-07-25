---
id: 'component.frontend.frontend.src.components.operator.cartella.clinicaltable.clinicaltable'
kind: 'typescript-react-component'
title: 'ClinicalTable'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/operator/cartella/ClinicalTable.tsx.'
bounded_contexts:
  - 'context.identity-access'
sources:
  - path: 'frontend/src/components/operator/cartella/ClinicalTable.tsx'
    symbol: 'ClinicalTable'
    line_start: '82'
    line_end: '316'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/operator/cartella/ClinicalTable.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
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
