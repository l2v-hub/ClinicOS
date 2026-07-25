---
id: "component.backend.backend.src.ai.config.aiprovider"
kind: "typescript-type-alias"
title: "AiProvider"
status: "observed"
summary: "Exported type-alias from backend/src/ai/config.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/config.ts"
    symbol: "AiProvider"
    line_start: "21"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/config.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.config.aiprovider` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.config.aiprovider is the canonical typescript-type-alias named AiProvider.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `AiProvider`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/config.ts:21-21` — AiProvider

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
