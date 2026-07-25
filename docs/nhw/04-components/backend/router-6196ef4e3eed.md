---
id: "component.backend.backend.src.routes.therapy.router"
kind: "typescript-constant"
title: "router"
status: "observed"
summary: "Exported constant from backend/src/routes/therapy.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/routes/therapy.ts"
    symbol: "router"
    line_start: "5"
    line_end: "5"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/therapy.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.routes.therapy.router` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.therapy.router is the canonical typescript-constant named router.

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

The symbol is exported across its module boundary as `router`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/routes/therapy.ts:5-5` — router

## Related Knowledge

- `belongs-to` → `project.backend`
