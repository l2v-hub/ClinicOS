---
id: 'component.backend.backend.src.ai.sections.patient-narrative.narrativesectionrow'
kind: 'typescript-interface'
title: 'NarrativeSectionRow'
status: 'observed'
summary: 'Exported interface from backend/src/ai/sections/patient-narrative.ts.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/ai/sections/patient-narrative.ts'
    symbol: 'NarrativeSectionRow'
    line_start: '65'
    line_end: '71'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/sections/patient-narrative.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.sections.patient-narrative.narrativesectionrow` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.patient-narrative.narrativesectionrow is the canonical typescript-interface named NarrativeSectionRow.

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

The symbol is exported across its module boundary as `NarrativeSectionRow`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/patient-narrative.ts:65-71` — NarrativeSectionRow

## Related Knowledge

- `belongs-to` → `project.backend`
