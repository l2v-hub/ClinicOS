---
id: "api.backend.get-patients-by-param-documents-by-param-content-92"
kind: "api-endpoint"
title: "GET /patients/:patientId/documents/:documentId/content"
status: "observed"
summary: "GET /patients/:patientId/documents/:documentId/content endpoint implemented by the express runtime."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/routes/patient-documents.ts"
    symbol: "router"
    line_start: "204"
    line_end: "228"
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

What does `api.backend.get-patients-by-param-documents-by-param-content-92` represent in ClinicOS?

## Canonical Definition

api.backend.get-patients-by-param-documents-by-param-content-92 is the canonical api-endpoint named GET /patients/:patientId/documents/:documentId/content.

## Inputs

- Method: `GET`
- Path: `/patients/:patientId/documents/:documentId/content`
- Request inputs: `["req.params.documentId","req.params.patientId"]`
- Middleware/dependencies: `["requirePatientDocumentAccess"]`

## Outputs

Observed HTTP statuses: `[200,404,500]`; response model: `not explicitly declared`.

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

Observed error statuses: `[404,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/patient-documents.ts:204-228` — router

## Related Knowledge

- `belongs-to` → `project.backend`
