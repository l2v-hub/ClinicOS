---
id: "component.backend.backend.src.ai.gateway.filters.namematchesalltokens"
kind: "typescript-function"
title: "nameMatchesAllTokens"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/filters.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/filters.ts"
    symbol: "nameMatchesAllTokens"
    line_start: "13"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/filters.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.filters.namematchesalltokens` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.filters.namematchesalltokens is the canonical typescript-function named nameMatchesAllTokens.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/gateway.test.ts`
- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `nameMatchesAllTokens`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/filters.ts:13-21` — nameMatchesAllTokens

## Related Knowledge

- `belongs-to` → `project.backend`
