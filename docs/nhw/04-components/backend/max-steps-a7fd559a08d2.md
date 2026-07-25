---
id: "component.backend.backend.src.ai.gateway.query.validate.max-steps"
kind: "typescript-constant"
title: "MAX_STEPS"
status: "observed"
summary: "Exported constant from backend/src/ai/gateway/query/validate.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/gateway/query/validate.ts"
    symbol: "MAX_STEPS"
    line_start: "36"
    line_end: "36"
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

What does `component.backend.backend.src.ai.gateway.query.validate.max-steps` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.query.validate.max-steps is the canonical typescript-constant named MAX_STEPS.

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

The symbol is exported across its module boundary as `MAX_STEPS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/query/validate.ts:36-36` — MAX_STEPS

## Related Knowledge

- `belongs-to` → `project.backend`
