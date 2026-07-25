---
id: 'component.frontend.frontend.src.components.shared.aiassistantbutton.answerview'
kind: 'typescript-react-component'
title: 'AnswerView'
status: 'observed'
summary: 'Exported react-component from frontend/src/components/shared/AIAssistantButton.tsx.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'frontend/src/components/shared/AIAssistantButton.tsx'
    symbol: 'AnswerView'
    line_start: '270'
    line_end: '316'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/AIAssistantButton.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'react-component'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.aiassistantbutton.answerview` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.aiassistantbutton.answerview is the canonical typescript-react-component named AnswerView.

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

The symbol is exported across its module boundary as `AnswerView`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/AIAssistantButton.tsx:270-316` — AnswerView

## Related Knowledge

- `belongs-to` → `project.frontend`
