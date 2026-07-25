---
id: 'component.frontend.frontend.src.components.shared.sections.sectionmapping.allergystatuslabel'
kind: 'typescript-function'
title: 'allergyStatusLabel'
status: 'observed'
summary: 'Exported function from frontend/src/components/shared/sections/sectionMapping.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/components/shared/sections/sectionMapping.ts'
    symbol: 'allergyStatusLabel'
    line_start: '64'
    line_end: '66'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/sections/sectionMapping.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.sectionmapping.allergystatuslabel` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.sectionmapping.allergystatuslabel is the canonical typescript-function named allergyStatusLabel.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/sections/ImportSectionsReview.tsx`

## Invariants

The symbol is exported across its module boundary as `allergyStatusLabel`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/sectionMapping.ts:64-66` — allergyStatusLabel

## Related Knowledge

- `belongs-to` → `project.frontend`
