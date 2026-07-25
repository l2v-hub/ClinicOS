---
id: "api.backend.post-patient-intake-discharge-letter-extract-94"
kind: "api-endpoint"
title: "POST /patient-intake/discharge-letter/extract"
status: "observed"
summary: "POST /patient-intake/discharge-letter/extract endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-intake.ts"
    symbol: "router"
    line_start: "41"
    line_end: "79"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-intake.ts"
    confidence: "observed"
  - type: "writes"
    target: "data.model.patientintakedocument"
    evidence: "backend/src/routes/patient-intake.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `api.backend.post-patient-intake-discharge-letter-extract-94` represent in ClinicOS?

## Canonical Definition

api.backend.post-patient-intake-discharge-letter-extract-94 is the canonical api-endpoint named POST /patient-intake/discharge-letter/extract.

## Inputs

- Method: `POST`
- Path: `/patient-intake/discharge-letter/extract`
- Request inputs: `["req.body"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400,404,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientIntakeDocument.findUnique","prisma.patientIntakeDocument.update"]`
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

- `backend/src/routes/patient-intake.ts:41-79` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `writes` → `data.model.patientintakedocument`
