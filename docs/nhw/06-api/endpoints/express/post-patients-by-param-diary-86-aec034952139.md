---
id: "api.backend.post-patients-by-param-diary-86"
kind: "api-endpoint"
title: "POST /patients/:patientId/diary"
status: "observed"
summary: "POST /patients/:patientId/diary endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-diary.ts"
    symbol: "router"
    line_start: "36"
    line_end: "76"
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
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `api.backend.post-patients-by-param-diary-86` represent in ClinicOS?

## Canonical Definition

api.backend.post-patients-by-param-diary-86 is the canonical api-endpoint named POST /patients/:patientId/diary.

## Inputs

- Method: `POST`
- Path: `/patients/:patientId/diary`
- Request inputs: `["req.body","req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[201,400,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientDiaryEntry.create"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[400,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/patient-diary.ts:36-76` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.patientdiaryentry`
