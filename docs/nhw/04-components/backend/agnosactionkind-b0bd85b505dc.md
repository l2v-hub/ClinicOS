---
id: "component.backend.backend.src.ai.actions.catalog.agnosactionkind"
kind: "typescript-type-alias"
title: "AgnosActionKind"
status: "observed"
summary: "Exported type-alias from backend/src/ai/actions/catalog.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/actions/catalog.ts"
    symbol: "AgnosActionKind"
    line_start: "8"
    line_end: "8"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/actions/catalog.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.catalog.agnosactionkind` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.catalog.agnosactionkind is the canonical typescript-type-alias named AgnosActionKind.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`

## Invariants

The symbol is exported across its module boundary as `AgnosActionKind`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/catalog.ts:8-8` — AgnosActionKind

## Related Knowledge

- `belongs-to` → `project.backend`
