---
id: "component.backend.backend.src.ai.gateway.types.patientsearchinput"
kind: "typescript-interface"
title: "PatientSearchInput"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/types.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/types.ts"
    symbol: "PatientSearchInput"
    line_start: "48"
    line_end: "56"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/gateway/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.types.patientsearchinput` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.types.patientsearchinput is the canonical typescript-interface named PatientSearchInput.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `PatientSearchInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/types.ts:48-56` — PatientSearchInput

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
