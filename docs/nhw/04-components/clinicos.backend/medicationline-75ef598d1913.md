---
id: "component.backend.backend.src.ai.sections.validate.medicationline"
kind: "typescript-interface"
title: "MedicationLine"
status: "observed"
summary: "Exported interface from backend/src/ai/sections/validate.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/ai/sections/validate.ts"
    symbol: "MedicationLine"
    line_start: "50"
    line_end: "59"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/sections/validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.validate.medicationline` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.validate.medicationline is the canonical typescript-interface named MedicationLine.

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

The symbol is exported across its module boundary as `MedicationLine`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/validate.ts:50-59` — MedicationLine

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
