---
id: "component.frontend.frontend.src.types.operatore"
kind: "typescript-interface"
title: "Operatore"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/types.ts"
    symbol: "Operatore"
    line_start: "115"
    line_end: "130"
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

What does `component.frontend.frontend.src.types.operatore` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.operatore is the canonical typescript-interface named Operatore.

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
- `frontend/src/components/admin/AdminAgenda.tsx`
- `frontend/src/components/admin/AdminDashboard.tsx`
- `frontend/src/components/admin/OperatorManagement.tsx`
- `frontend/src/components/admin/OperatorSchedule.tsx`
- `frontend/src/components/operator/OperatorAgenda.tsx`
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/shared/AppointmentForm.tsx`
- `frontend/src/components/shared/NewPatientModal.tsx`
- `frontend/src/components/shared/NotesPage.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `Operatore`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:115-130` — Operatore

## Related Knowledge

- `belongs-to` → `project.frontend`
