---
id: 'component.backend.backend.src.routes.ai-assistant-public.assistantpublicrouter'
kind: 'typescript-constant'
title: 'assistantPublicRouter'
status: 'observed'
summary: 'Exported constant from backend/src/routes/ai-assistant-public.ts.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'backend/src/routes/ai-assistant-public.ts'
    symbol: 'assistantPublicRouter'
    line_start: '15'
    line_end: '15'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/ai-assistant-public.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'constant'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.backend.backend.src.routes.ai-assistant-public.assistantpublicrouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.ai-assistant-public.assistantpublicrouter is the canonical typescript-constant named assistantPublicRouter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/app.ts`

## Invariants

The symbol is exported across its module boundary as `assistantPublicRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/ai-assistant-public.ts:15-15` — assistantPublicRouter

## Related Knowledge

- `belongs-to` → `project.backend`
