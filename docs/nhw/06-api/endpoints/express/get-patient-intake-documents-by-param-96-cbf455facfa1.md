---
id: "api.backend.get-patient-intake-documents-by-param-96"
kind: "api-endpoint"
title: "GET /patient-intake/documents/:patientId"
status: "observed"
summary: "GET /patient-intake/documents/:patientId endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-intake.ts"
    symbol: "router"
    line_start: "112"
    line_end: "136"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-intake.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.patientintakedocument"
    evidence: "backend/src/routes/patient-intake.ts"
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

What does `api.backend.get-patient-intake-documents-by-param-96` represent in ClinicOS?

## Canonical Definition

api.backend.get-patient-intake-documents-by-param-96 is the canonical api-endpoint named GET /patient-intake/documents/:patientId.

## Inputs

- Method: `GET`
- Path: `/patient-intake/documents/:patientId`
- Request inputs: `["req.params"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.patientIntakeDocument.findMany"]`
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

- `backend/src/routes/patient-intake.ts:112-136` — router

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.patientintakedocument`
