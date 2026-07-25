---
id: 'component.backend.backend.src.ai.sections.validate.medicationline'
kind: 'typescript-interface'
title: 'MedicationLine'
status: 'observed'
summary: 'Exported interface from backend/src/ai/sections/validate.ts.'
bounded_contexts:
  - 'context.therapy-administration'
sources:
  - path: 'backend/src/ai/sections/validate.ts'
    symbol: 'MedicationLine'
    line_start: '50'
    line_end: '59'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/sections/validate.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
