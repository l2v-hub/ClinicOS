---
id: "component.backend.backend.src.ai.config.publicstatus"
kind: "typescript-function"
title: "publicStatus"
status: "observed"
summary: "Exported function from backend/src/ai/config.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/config.ts"
    symbol: "publicStatus"
    line_start: "191"
    line_end: "207"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/config.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.config.publicstatus` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.config.publicstatus is the canonical typescript-function named publicStatus.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/config.test.ts`
- `backend/src/routes/ai-extraction.ts`
- `backend/src/server.ts`

## Invariants

The symbol is exported across its module boundary as `publicStatus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/config.ts:191-207` — publicStatus

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
