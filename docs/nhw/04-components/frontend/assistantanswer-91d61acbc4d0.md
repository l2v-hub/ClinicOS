---
id: "component.frontend.frontend.src.components.shared.aiassistantbutton.assistantanswer"
kind: "typescript-interface"
title: "AssistantAnswer"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/AIAssistantButton.tsx."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "frontend/src/components/shared/AIAssistantButton.tsx"
    symbol: "AssistantAnswer"
    line_start: "30"
    line_end: "38"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/AIAssistantButton.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.aiassistantbutton.assistantanswer` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.aiassistantbutton.assistantanswer is the canonical typescript-interface named AssistantAnswer.

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
- `frontend/src/components/shared/agnos/useAgnosChat.ts`

## Invariants

The symbol is exported across its module boundary as `AssistantAnswer`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/AIAssistantButton.tsx:30-38` — AssistantAnswer

## Related Knowledge

- `belongs-to` → `project.frontend`
