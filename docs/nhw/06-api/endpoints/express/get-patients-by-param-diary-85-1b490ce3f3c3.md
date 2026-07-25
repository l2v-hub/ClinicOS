---
id: "api.backend.get-patients-by-param-diary-85"
kind: "api-endpoint"
title: "GET /patients/:patientId/diary"
status: "observed"
summary: "GET /patients/:patientId/diary endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-diary.ts"
    symbol: "router"
    line_start: "8"
    line_end: "33"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-diary.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.patientdiaryentry"
    evidence: "backend/src/routes/patient-diary.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `api.backend.get-patients-by-param-diary-85` represent in ClinicOS?

## Canonical Definition

api.backend.get-patients-by-param-diary-85 is the canonical api-endpoint named GET /patients/:patientId/diary.

## Inputs

- Method: `GET`
- Path: `/patients/:patientId/diary`
- Request inputs: `["req.params","req.query"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientDiaryEntry.findMany"]`
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

- `backend/src/routes/patient-diary.ts:8-33` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.patientdiaryentry`
