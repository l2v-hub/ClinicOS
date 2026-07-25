---
id: "component.backend.backend.src.therapies.therapy-create.therapycreateinput"
kind: "typescript-interface"
title: "TherapyCreateInput"
status: "observed"
summary: "Exported interface from backend/src/therapies/therapy-create.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/therapies/therapy-create.ts"
    symbol: "TherapyCreateInput"
    line_start: "28"
    line_end: "54"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/therapies/therapy-create.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.therapies.therapy-create.therapycreateinput` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.therapies.therapy-create.therapycreateinput is the canonical typescript-interface named TherapyCreateInput.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/upload/confirm-service.ts`
- `backend/src/routes/patient-therapies.ts`

## Invariants

The symbol is exported across its module boundary as `TherapyCreateInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/therapies/therapy-create.ts:28-54` — TherapyCreateInput

## Related Knowledge

- `belongs-to` → `project.backend`
