---
id: "component.backend.backend.src.ai.upload.confirm-service.confirmpatient"
kind: "typescript-interface"
title: "ConfirmPatient"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/confirm-service.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/upload/confirm-service.ts"
    symbol: "ConfirmPatient"
    line_start: "39"
    line_end: "50"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/confirm-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.confirm-service.confirmpatient` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.confirm-service.confirmpatient is the canonical typescript-interface named ConfirmPatient.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `ConfirmPatient`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/confirm-service.ts:39-50` — ConfirmPatient

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
