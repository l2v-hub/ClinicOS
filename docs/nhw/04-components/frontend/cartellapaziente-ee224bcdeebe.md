---
id: "component.frontend.frontend.src.types.cartellapaziente"
kind: "typescript-interface"
title: "CartellaPaziente"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/types.ts"
    symbol: "CartellaPaziente"
    line_start: "456"
    line_end: "506"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.types.cartellapaziente` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.cartellapaziente is the canonical typescript-interface named CartellaPaziente.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`
- `frontend/src/components/admin/AdminDashboard.tsx`
- `frontend/src/components/operator/InvioPSModal.tsx`
- `frontend/src/components/operator/MultiPatientParametri.tsx`
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/operator/PatientCompactHeader.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/operator/cartella/ContenzioniTab.tsx`
- `frontend/src/components/operator/cartella/DimissioneTab.tsx`
- `frontend/src/components/operator/cartella/DocumentiTab.tsx`
- `frontend/src/components/operator/cartella/EsamiConsulenzeTab.tsx`
- `frontend/src/components/operator/cartella/MedicazioniTab.tsx`
- `frontend/src/components/operator/cartella/ParametriModuloView.tsx`
- `frontend/src/components/operator/cartella/ParametriTab.tsx`
- `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx`
- `frontend/src/components/operator/cartella/ScalaBradenTab.tsx`
- `frontend/src/components/operator/cartella/ScalaNRSTab.tsx`
- `frontend/src/components/operator/cartella/ScalaTinettiTab.tsx`
- `frontend/src/components/operator/sections/PainAssessmentEditor.tsx`
- `frontend/src/components/operator/sections/VitalSignsEditor.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `CartellaPaziente`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:456-506` — CartellaPaziente

## Related Knowledge

- `belongs-to` → `project.frontend`
