---
id: 'component.frontend.frontend.src.components.shared.sections.sectionmapping.sectionmapentry'
kind: 'typescript-interface'
title: 'SectionMapEntry'
status: 'observed'
summary: 'Exported interface from frontend/src/components/shared/sections/sectionMapping.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/components/shared/sections/sectionMapping.ts'
    symbol: 'SectionMapEntry'
    line_start: '10'
    line_end: '16'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/sections/sectionMapping.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.sectionmapping.sectionmapentry` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.sectionmapping.sectionmapentry is the canonical typescript-interface named SectionMapEntry.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `SectionMapEntry`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/sectionMapping.ts:10-16` — SectionMapEntry

## Related Knowledge

- `belongs-to` → `project.frontend`
