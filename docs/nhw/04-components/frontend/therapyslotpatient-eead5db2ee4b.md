---
id: "component.frontend.frontend.src.types.therapyslotpatient"
kind: "typescript-interface"
title: "TherapySlotPatient"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "frontend/src/types.ts"
    symbol: "TherapySlotPatient"
    line_start: "948"
    line_end: "955"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.types.therapyslotpatient` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.therapyslotpatient is the canonical typescript-interface named TherapySlotPatient.

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
- `frontend/src/components/operator/TherapySlotModal.tsx`
- `frontend/src/mockData.ts`

## Invariants

The symbol is exported across its module boundary as `TherapySlotPatient`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:948-955` — TherapySlotPatient

## Related Knowledge

- `belongs-to` → `project.frontend`
