---
id: "component.backend.backend.src.ai.gateway.filters.allergyitem"
kind: "typescript-interface"
title: "AllergyItem"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/filters.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/filters.ts"
    symbol: "AllergyItem"
    line_start: "79"
    line_end: "85"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/filters.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.filters.allergyitem` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.filters.allergyitem is the canonical typescript-interface named AllergyItem.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `AllergyItem`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/filters.ts:79-85` — AllergyItem

## Related Knowledge

- `belongs-to` → `project.backend`
