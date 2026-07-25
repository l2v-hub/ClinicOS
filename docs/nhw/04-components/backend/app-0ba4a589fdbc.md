---
id: "component.backend.backend.src.app.app"
kind: "typescript-constant"
title: "app"
status: "observed"
summary: "Exported constant from backend/src/app.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/app.ts"
    symbol: "app"
    line_start: "24"
    line_end: "24"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/app.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.backend.backend.src.app.app` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.app.app is the canonical typescript-constant named app.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/scripts/confirm-smoke.mts`
- `backend/scripts/jobs-smoke.mts`
- `backend/src/server.ts`
- `e2e/async-smoke.mjs`
- `e2e/import-e2e.mjs`
- `e2e/new-vs-existing-smoke.mjs`
- `e2e/therapy-import-api.mjs`

## Invariants

The symbol is exported across its module boundary as `app`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/app.ts:24-24` — app

## Related Knowledge

- `belongs-to` → `project.backend`
