---
id: 'component.frontend.frontend.src.components.shared.agnospanel.agnospanel'
kind: 'typescript-react-component'
title: 'AgnosPanel'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/shared/AgnosPanel.tsx.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'frontend/src/components/shared/AgnosPanel.tsx'
    symbol: 'AgnosPanel'
    line_start: '50'
    line_end: '343'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/AgnosPanel.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.agnospanel.agnospanel` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.agnospanel.agnospanel is the canonical typescript-react-component named AgnosPanel.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`

## Invariants

The symbol is exported across its module boundary as `AgnosPanel`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/AgnosPanel.tsx:50-343` — AgnosPanel

## Related Knowledge

- `belongs-to` → `project.frontend`
