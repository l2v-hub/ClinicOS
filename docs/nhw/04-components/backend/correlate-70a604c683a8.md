---
id: 'component.backend.backend.src.ai.gateway.services.correlate'
kind: 'typescript-function'
title: 'correlate'
status: 'observed'
summary: 'Exported function from backend/src/ai/gateway/services.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/gateway/services.ts'
    symbol: 'correlate'
    line_start: '489'
    line_end: '555'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/gateway/services.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.services.correlate` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.services.correlate is the canonical typescript-function named correlate.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `correlate`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/services.ts:489-555` — correlate

## Related Knowledge

- `belongs-to` → `project.backend`
