---
id: 'component.frontend.frontend.src.components.shared.intake.intakedraftapi.draftresponse'
kind: 'typescript-interface'
title: 'DraftResponse'
status: 'observed'
summary: 'Exported interface from frontend/src/components/shared/intake/intakeDraftApi.ts.'
bounded_contexts:
  - 'context.intake-document-processing'
sources:
  - path: 'frontend/src/components/shared/intake/intakeDraftApi.ts'
    symbol: 'DraftResponse'
    line_start: '25'
    line_end: '28'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/intake/intakeDraftApi.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.intakedraftapi.draftresponse` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.intakedraftapi.draftresponse is the canonical typescript-interface named DraftResponse.

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

The symbol is exported across its module boundary as `DraftResponse`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/intakeDraftApi.ts:25-28` — DraftResponse

## Related Knowledge

- `belongs-to` → `project.frontend`
