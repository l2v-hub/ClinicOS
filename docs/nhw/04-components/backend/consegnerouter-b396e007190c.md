---
id: "component.backend.backend.src.routes.consegne.consegnerouter"
kind: "typescript-constant"
title: "consegneRouter"
status: "observed"
summary: "Exported constant from backend/src/routes/consegne.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/routes/consegne.ts"
    symbol: "consegneRouter"
    line_start: "9"
    line_end: "9"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/consegne.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.routes.consegne.consegnerouter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.consegne.consegnerouter is the canonical typescript-constant named consegneRouter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/app.ts`

## Invariants

The symbol is exported across its module boundary as `consegneRouter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/consegne.ts:9-9` — consegneRouter

## Related Knowledge

- `belongs-to` → `project.backend`
