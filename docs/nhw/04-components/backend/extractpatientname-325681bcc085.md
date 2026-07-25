---
id: 'component.backend.backend.src.ai.assistant.plan.extractpatientname'
kind: 'typescript-function'
title: 'extractPatientName'
status: 'observed'
summary: 'Exported function from backend/src/ai/assistant/plan.ts.'
bounded_contexts:
  - 'context.patient-registry'
sources:
  - path: 'backend/src/ai/assistant/plan.ts'
    symbol: 'extractPatientName'
    line_start: '279'
    line_end: '296'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/assistant/plan.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.assistant.plan.extractpatientname` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.assistant.plan.extractpatientname is the canonical typescript-function named extractPatientName.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/assistant-plan.test.ts`
- `backend/src/ai/assistant/service.ts`

## Invariants

The symbol is exported across its module boundary as `extractPatientName`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/assistant/plan.ts:279-296` — extractPatientName

## Related Knowledge

- `belongs-to` → `project.backend`
