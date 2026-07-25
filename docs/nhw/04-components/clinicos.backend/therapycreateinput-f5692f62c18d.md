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
    target: "project.clinicos.backend"
    evidence: "backend/src/therapies/therapy-create.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
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

Owning project: `project.clinicos.backend`.

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

- `belongs-to` → `project.clinicos.backend`
