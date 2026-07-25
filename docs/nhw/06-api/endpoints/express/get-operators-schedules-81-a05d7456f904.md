---
id: "api.backend.get-operators-schedules-81"
kind: "api-endpoint"
title: "GET /operators/schedules"
status: "observed"
summary: "GET /operators/schedules endpoint implemented by the express runtime."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/routes/operators.ts"
    symbol: "operatorsRouter"
    line_start: "77"
    line_end: "90"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/operators.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.operatorschedule"
    evidence: "backend/src/routes/operators.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `api.backend.get-operators-schedules-81` represent in ClinicOS?

## Canonical Definition

api.backend.get-operators-schedules-81 is the canonical api-endpoint named GET /operators/schedules.

## Inputs

- Method: `GET`
- Path: `/operators/schedules`
- Request inputs: None observed
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.operatorSchedule.findMany"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/operators.ts:77-90` — operatorsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.operatorschedule`
