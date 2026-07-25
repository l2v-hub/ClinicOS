---
id: "component.backend.backend.src.ai.gateway.query.validate.max-rows"
kind: "typescript-constant"
title: "MAX_ROWS"
status: "observed"
summary: "Exported constant from backend/src/ai/gateway/query/validate.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/validate.ts"
    symbol: "MAX_ROWS"
    line_start: "37"
    line_end: "37"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/query/validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.query.validate.max-rows` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.validate.max-rows is the canonical typescript-constant named MAX_ROWS.

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

The symbol is exported across its module boundary as `MAX_ROWS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/validate.ts:37-37` — MAX_ROWS

## Related Knowledge

- `belongs-to` → `project.backend`
