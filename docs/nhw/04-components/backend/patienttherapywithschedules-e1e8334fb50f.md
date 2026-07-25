---
id: "component.backend.backend.src.therapies.therapy-create.patienttherapywithschedules"
kind: "typescript-type-alias"
title: "PatientTherapyWithSchedules"
status: "observed"
summary: "Exported type-alias from backend/src/therapies/therapy-create.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/therapies/therapy-create.ts"
    symbol: "PatientTherapyWithSchedules"
    line_start: "23"
    line_end: "25"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/therapies/therapy-create.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.therapies.therapy-create.patienttherapywithschedules` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.therapies.therapy-create.patienttherapywithschedules is the canonical typescript-type-alias named PatientTherapyWithSchedules.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `PatientTherapyWithSchedules`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/therapies/therapy-create.ts:23-25` — PatientTherapyWithSchedules

## Related Knowledge

- `belongs-to` → `project.backend`
