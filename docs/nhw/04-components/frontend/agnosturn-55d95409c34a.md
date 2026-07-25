---
id: 'component.frontend.frontend.src.components.shared.agnos.useagnoschat.agnosturn'
kind: 'typescript-interface'
title: 'AgnosTurn'
status: 'observed'
summary: 'Exported interface from frontend/src/components/shared/agnos/useAgnosChat.ts.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'frontend/src/components/shared/agnos/useAgnosChat.ts'
    symbol: 'AgnosTurn'
    line_start: '41'
    line_end: '48'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/agnos/useAgnosChat.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.agnos.useagnoschat.agnosturn` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.agnos.useagnoschat.agnosturn is the canonical typescript-interface named AgnosTurn.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/AgnosPanel.tsx`

## Invariants

The symbol is exported across its module boundary as `AgnosTurn`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/agnos/useAgnosChat.ts:41-48` — AgnosTurn

## Related Knowledge

- `belongs-to` → `project.frontend`
