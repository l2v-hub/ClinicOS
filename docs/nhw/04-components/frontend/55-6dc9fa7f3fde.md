---
id: "api.consumer.frontend.frontend.src.components.shared.dischargeletterimport.tsx.181.55"
kind: "frontend-api-consumer"
title: "DischargeLetterImport POST /patient-intake/discharge-letter/extract"
status: "observed"
summary: "Frontend request issued by DischargeLetterImport."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "frontend/src/components/shared/DischargeLetterImport.tsx"
    symbol: "DischargeLetterImport"
    line_start: "181"
    line_end: "185"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/DischargeLetterImport.tsx"
    confidence: "observed"
tags:
  - "frontend"
  - "api-consumer"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `api.consumer.frontend.frontend.src.components.shared.dischargeletterimport.tsx.181.55` represent in ClinicOS?

## Canonical Definition

api.consumer.frontend.frontend.src.components.shared.dischargeletterimport.tsx.181.55 is the canonical frontend-api-consumer named DischargeLetterImport POST /patient-intake/discharge-letter/extract.

## Inputs

HTTP method: `POST`; path template: `/patient-intake/discharge-letter/extract`.

## Outputs

Consumes the backend HTTP response.

## Dependencies

Backend route matching is resolved by method and normalized path.

## Side Effects

Performs a browser-originated HTTP request.

## Consumers

Frontend caller: `DischargeLetterImport`.

## Invariants

The configured API base URL is applied by the frontend request layer.

## Failure Modes

None observed

## Evidence

- `frontend/src/components/shared/DischargeLetterImport.tsx:181-185` — DischargeLetterImport

## Related Knowledge

- `belongs-to` → `project.frontend`
