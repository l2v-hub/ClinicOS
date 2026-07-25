---
id: "component.backend.backend.src.ai.auth.operator"
kind: "typescript-interface"
title: "Operator"
status: "observed"
summary: "Exported interface from backend/src/ai/auth.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/ai/auth.ts"
    symbol: "Operator"
    line_start: "11"
    line_end: "14"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/auth.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.ai.auth.operator` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.auth.operator is the canonical typescript-interface named Operator.

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

The symbol is exported across its module boundary as `Operator`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/auth.ts:11-14` — Operator

## Related Knowledge

- `belongs-to` → `project.backend`
