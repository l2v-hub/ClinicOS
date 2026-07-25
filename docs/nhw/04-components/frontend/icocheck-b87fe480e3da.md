---
id: "component.frontend.frontend.src.icons.icocheck"
kind: "typescript-react-component"
title: "IcoCheck"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoCheck"
    line_start: "352"
    line_end: "363"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/icons.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icocheck` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icocheck is the canonical typescript-react-component named IcoCheck.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/ExpCard.tsx`
- `frontend/src/components/admin/OperatorManagement.tsx`
- `frontend/src/components/admin/OperatorSchedule.tsx`
- `frontend/src/components/admin/RoomsManagement.tsx`
- `frontend/src/components/operator/ConsegnePage.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/operator/cartella/ContenzioniTab.tsx`
- `frontend/src/components/operator/cartella/DimissioneTab.tsx`
- `frontend/src/components/operator/cartella/DocumentiTab.tsx`
- `frontend/src/components/operator/cartella/MedicazioniTab.tsx`
- `frontend/src/components/operator/cartella/ParametriTab.tsx`
- `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx`
- `frontend/src/components/operator/cartella/VitaleModal.tsx`
- `frontend/src/components/operator/sections/AllergiesEditor.tsx`
- `frontend/src/components/operator/sections/AnamnesisEditor.tsx`
- `frontend/src/components/shared/AppointmentForm.tsx`
- `frontend/src/components/shared/ConfirmDialog.tsx`
- `frontend/src/components/shared/NewPatientModal.tsx`
- `frontend/src/components/shared/NotesPage.tsx`
- `frontend/src/components/shared/intake/StepVerifica.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoCheck`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:352-363` — IcoCheck

## Related Knowledge

- `belongs-to` → `project.frontend`
