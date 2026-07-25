---
id: "component.backend.backend.src.routes.narrative-sections.router"
kind: "typescript-constant"
title: "router"
status: "observed"
summary: "Exported constant from backend/src/routes/narrative-sections.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/routes/narrative-sections.ts"
    symbol: "router"
    line_start: "13"
    line_end: "13"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/narrative-sections.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.routes.narrative-sections.router` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.routes.narrative-sections.router is the canonical typescript-constant named router.

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

- `backend/src/routes/narrative-sections.ts:13-13` — router

## Related Knowledge

- `belongs-to` → `project.backend`
