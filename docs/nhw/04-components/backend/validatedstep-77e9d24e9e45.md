---
id: 'component.backend.backend.src.ai.gateway.query.validate.validatedstep'
kind: 'typescript-interface'
title: 'ValidatedStep'
status: 'observed'
summary: 'Exported interface from backend/src/ai/gateway/query/validate.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/gateway/query/validate.ts'
    symbol: 'ValidatedStep'
    line_start: '18'
    line_end: '29'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/gateway/query/validate.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'interface'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.validate.validatedstep` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.validate.validatedstep is the canonical typescript-interface named ValidatedStep.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/query/engine.ts`

## Invariants

The symbol is exported across its module boundary as `ValidatedStep`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/validate.ts:18-29` — ValidatedStep

## Related Knowledge

- `belongs-to` → `project.backend`
