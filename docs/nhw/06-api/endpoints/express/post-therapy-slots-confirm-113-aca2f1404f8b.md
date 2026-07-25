---
id: "api.backend.post-therapy-slots-confirm-113"
kind: "api-endpoint"
title: "POST /therapy-slots/confirm"
status: "observed"
summary: "POST /therapy-slots/confirm endpoint implemented by the express runtime."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/routes/therapy.ts"
    symbol: "router"
    line_start: "196"
    line_end: "280"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/therapy.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.medicationadministration"
    evidence: "backend/src/routes/therapy.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.backend.post-therapy-slots-confirm-113` represent in ClinicOS?

## Canonical Definition

api.backend.post-therapy-slots-confirm-113 is the canonical api-endpoint named POST /therapy-slots/confirm.

## Inputs

- Method: `POST`
- Path: `/therapy-slots/confirm`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400,409,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.medicationAdministration.findUnique","prisma.medicationAdministration.upsert"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,409,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/therapy.ts:196-280` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.medicationadministration`
