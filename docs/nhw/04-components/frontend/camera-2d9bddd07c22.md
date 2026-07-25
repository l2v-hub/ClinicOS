---
id: "component.frontend.frontend.src.types.camera"
kind: "typescript-interface"
title: "Camera"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "Camera"
    line_start: "201"
    line_end: "210"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.types.camera` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.camera is the canonical typescript-interface named Camera.

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
- `frontend/src/components/operator/PatientDetail.tsx`
- `frontend/src/components/operator/PatientList.tsx`
- `frontend/src/components/shared/NewPatientModal.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `Camera`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:201-210` — Camera

## Related Knowledge

- `belongs-to` → `project.frontend`
