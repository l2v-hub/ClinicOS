---
id: "component.frontend.frontend.src.components.shared.agnos.usevoiceinput.usevoiceinput"
kind: "typescript-function"
title: "useVoiceInput"
status: "observed"
summary: "Exported function from frontend/src/components/shared/agnos/useVoiceInput.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "frontend/src/components/shared/agnos/useVoiceInput.ts"
    symbol: "useVoiceInput"
    line_start: "39"
    line_end: "121"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/agnos/useVoiceInput.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.agnos.usevoiceinput.usevoiceinput` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.agnos.usevoiceinput.usevoiceinput is the canonical typescript-function named useVoiceInput.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/AgnosPanel.tsx`

## Invariants

The symbol is exported across its module boundary as `useVoiceInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/agnos/useVoiceInput.ts:39-121` — useVoiceInput

## Related Knowledge

- `belongs-to` → `project.frontend`
