---
id: "api.backend.delete-patients-by-param-diary-by-param-89"
kind: "api-endpoint"
title: "DELETE /patients/:patientId/diary/:entryId"
status: "observed"
summary: "DELETE /patients/:patientId/diary/:entryId endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-diary.ts"
    symbol: "router"
    line_start: "140"
    line_end: "156"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-diary.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.patientdiaryentry"
    evidence: "backend/src/routes/patient-diary.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "delete"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `api.backend.delete-patients-by-param-diary-by-param-89` represent in ClinicOS?

## Canonical Definition

api.backend.delete-patients-by-param-diary-by-param-89 is the canonical api-endpoint named DELETE /patients/:patientId/diary/:entryId.

## Inputs

- Method: `DELETE`
- Path: `/patients/:patientId/diary/:entryId`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientDiaryEntry.delete","prisma.patientDiaryEntry.findFirst"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[404,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/patient-diary.ts:140-156` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.patientdiaryentry`
