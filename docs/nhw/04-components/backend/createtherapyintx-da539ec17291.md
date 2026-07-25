---
id: "component.backend.backend.src.therapies.therapy-create.createtherapyintx"
kind: "typescript-function"
title: "createTherapyInTx"
status: "observed"
summary: "Exported function from backend/src/therapies/therapy-create.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/therapies/therapy-create.ts"
    symbol: "createTherapyInTx"
    line_start: "106"
    line_end: "185"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/therapies/therapy-create.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.therapies.therapy-create.createtherapyintx` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.therapies.therapy-create.createtherapyintx is the canonical typescript-function named createTherapyInTx.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/upload/confirm-service.ts`
- `backend/src/routes/patient-therapies.ts`
- `backend/src/therapies/__tests__/therapy-create.test.ts`

## Invariants

The symbol is exported across its module boundary as `createTherapyInTx`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/therapies/therapy-create.ts:106-185` — createTherapyInTx

## Related Knowledge

- `belongs-to` → `project.backend`
