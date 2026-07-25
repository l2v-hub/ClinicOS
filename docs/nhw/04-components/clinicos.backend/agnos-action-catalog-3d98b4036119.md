---
id: "component.backend.backend.src.ai.actions.catalog.agnos-action-catalog"
kind: "typescript-constant"
title: "AGNOS_ACTION_CATALOG"
status: "observed"
summary: "Exported constant from backend/src/ai/actions/catalog.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/actions/catalog.ts"
    symbol: "AGNOS_ACTION_CATALOG"
    line_start: "18"
    line_end: "85"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/actions/catalog.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.actions.catalog.agnos-action-catalog` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.actions.catalog.agnos-action-catalog is the canonical typescript-constant named AGNOS_ACTION_CATALOG.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/voice/audit.ts`

## Invariants

The symbol is exported across its module boundary as `AGNOS_ACTION_CATALOG`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/actions/catalog.ts:18-85` — AGNOS_ACTION_CATALOG

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
