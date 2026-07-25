---
id: 'component.frontend.frontend.src.components.shared.aiassistantbutton.assistantsource'
kind: 'typescript-interface'
title: 'AssistantSource'
status: 'observed'
summary: 'Exported interface from frontend/src/components/shared/AIAssistantButton.tsx.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'frontend/src/components/shared/AIAssistantButton.tsx'
    symbol: 'AssistantSource'
    line_start: '10'
    line_end: '20'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/components/shared/AIAssistantButton.tsx'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.aiassistantbutton.assistantsource` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.aiassistantbutton.assistantsource is the canonical typescript-interface named AssistantSource.

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

The symbol is exported across its module boundary as `AssistantSource`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/AIAssistantButton.tsx:10-20` — AssistantSource

## Related Knowledge

- `belongs-to` → `project.frontend`
