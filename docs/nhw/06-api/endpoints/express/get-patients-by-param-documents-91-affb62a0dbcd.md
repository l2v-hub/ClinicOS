---
id: "api.backend.get-patients-by-param-documents-91"
kind: "api-endpoint"
title: "GET /patients/:patientId/documents"
status: "observed"
summary: "GET /patients/:patientId/documents endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-documents.ts"
    symbol: "router"
    line_start: "194"
    line_end: "201"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/patient-documents.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `api.backend.get-patients-by-param-documents-91` represent in ClinicOS?

## Canonical Definition

api.backend.get-patients-by-param-documents-91 is the canonical api-endpoint named GET /patients/:patientId/documents.

## Inputs

- Method: `GET`
- Path: `/patients/:patientId/documents`
- Request inputs: `["req.params.patientId"]`
- Middleware/dependencies: `["requirePatientDocumentAccess"]`

## Outputs

Observed HTTP statuses: `[200,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: None observed
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

- `backend/src/routes/patient-documents.ts:194-201` — router

## Related Knowledge

- `belongs-to` → `project.backend`
