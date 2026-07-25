---
id: "component.backend.backend.src.routes.ai-assistant-public.ctxfromoperator"
kind: "typescript-function"
title: "ctxFromOperator"
status: "observed"
summary: "Exported function from backend/src/routes/ai-assistant-public.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/routes/ai-assistant-public.ts"
    symbol: "ctxFromOperator"
    line_start: "27"
    line_end: "36"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-assistant-public.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.routes.ai-assistant-public.ctxfromoperator` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.ai-assistant-public.ctxfromoperator is the canonical typescript-function named ctxFromOperator.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/security.test.ts`
- `backend/src/routes/ai-actions.ts`

## Invariants

The symbol is exported across its module boundary as `ctxFromOperator`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/ai-assistant-public.ts:27-36` — ctxFromOperator

## Related Knowledge

- `belongs-to` → `project.backend`
