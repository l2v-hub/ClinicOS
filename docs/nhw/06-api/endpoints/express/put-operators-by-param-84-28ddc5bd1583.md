---
id: "api.backend.put-operators-by-param-84"
kind: "api-endpoint"
title: "PUT /operators/:operatorId"
status: "observed"
summary: "PUT /operators/:operatorId endpoint implemented by the express runtime."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "backend/src/routes/operators.ts"
    symbol: "operatorsRouter"
    line_start: "188"
    line_end: "264"
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
tags:
  - "api"
  - "express"
  - "put"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `api.backend.put-operators-by-param-84` represent in ClinicOS?

## Canonical Definition

api.backend.put-operators-by-param-84 is the canonical api-endpoint named PUT /operators/:operatorId.

## Inputs

- Method: `PUT`
- Path: `/operators/:operatorId`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400,404,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.operator.findUnique","prisma.operator.update"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,404,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/operators.ts:188-264` — operatorsRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.operator`
