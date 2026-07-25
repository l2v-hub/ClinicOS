---
id: 'component.backend.backend.src.ai.redact.redactforlog'
kind: 'typescript-function'
title: 'redactForLog'
status: 'observed'
summary: 'Exported function from backend/src/ai/redact.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'backend/src/ai/redact.ts'
    symbol: 'redactForLog'
    line_start: '31'
    line_end: '49'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/ai/redact.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.ai.redact.redactforlog` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.redact.redactforlog is the canonical typescript-function named redactForLog.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/config.test.ts`

## Invariants

The symbol is exported across its module boundary as `redactForLog`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/redact.ts:31-49` — redactForLog

## Related Knowledge

- `belongs-to` → `project.backend`
