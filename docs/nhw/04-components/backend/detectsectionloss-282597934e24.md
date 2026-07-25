---
id: 'component.backend.backend.src.ai.sections.markdown-parse.detectsectionloss'
kind: 'typescript-function'
title: 'detectSectionLoss'
status: 'observed'
summary: 'Exported function from backend/src/ai/sections/markdown-parse.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/sections/markdown-parse.ts'
    symbol: 'detectSectionLoss'
    line_start: '254'
    line_end: '262'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/sections/markdown-parse.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.sections.markdown-parse.detectsectionloss` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.markdown-parse.detectsectionloss is the canonical typescript-function named detectSectionLoss.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/markdown-parse.test.ts`

## Invariants

The symbol is exported across its module boundary as `detectSectionLoss`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/markdown-parse.ts:254-262` — detectSectionLoss

## Related Knowledge

- `belongs-to` → `project.backend`
