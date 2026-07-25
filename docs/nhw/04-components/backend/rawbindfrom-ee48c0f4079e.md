---
id: "component.backend.backend.src.ai.gateway.query.dsl.rawbindfrom"
kind: "typescript-interface"
title: "RawBindFrom"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/query/dsl.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/dsl.ts"
    symbol: "RawBindFrom"
    line_start: "26"
    line_end: "30"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/query/dsl.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.dsl.rawbindfrom` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.dsl.rawbindfrom is the canonical typescript-interface named RawBindFrom.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/query/validate.ts`

## Invariants

The symbol is exported across its module boundary as `RawBindFrom`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/dsl.ts:26-30` — RawBindFrom

## Related Knowledge

- `belongs-to` → `project.backend`
