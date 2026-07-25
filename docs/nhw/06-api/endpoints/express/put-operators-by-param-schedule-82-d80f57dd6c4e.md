---
id: "api.backend.put-operators-by-param-schedule-82"
kind: "api-endpoint"
title: "PUT /operators/:operatorId/schedule"
status: "observed"
summary: "PUT /operators/:operatorId/schedule endpoint implemented by the express runtime."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/routes/operators.ts"
    symbol: "operatorsRouter"
    line_start: "93"
    line_end: "120"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/operators.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.operator"
    evidence: "backend/src/routes/operators.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.operatorschedule"
    evidence: "backend/src/routes/operators.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "put"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `api.backend.put-operators-by-param-schedule-82` represent in ClinicOS?

## Canonical Definition

api.backend.put-operators-by-param-schedule-82 is the canonical api-endpoint named PUT /operators/:operatorId/schedule.

## Inputs

- Method: `PUT`
- Path: `/operators/:operatorId/schedule`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.operator.findUnique","prisma.operatorSchedule.upsert"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,404,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/operators.ts:93-120` — operatorsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.operator`
- `writes` → `data.model.operatorschedule`
