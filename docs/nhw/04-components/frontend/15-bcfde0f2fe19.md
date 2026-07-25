---
id: "api.consumer.frontend.frontend.src.app.tsx.714.15"
kind: "frontend-api-consumer"
title: "loadCartella GET /patients/${pazienteId}/cartella"
status: "observed"
summary: "Frontend request issued by loadCartella."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "frontend/src/App.tsx"
    symbol: "loadCartella"
    line_start: "714"
    line_end: "714"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/App.tsx"
    confidence: "observed"
tags:
  - "frontend"
  - "api-consumer"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.consumer.frontend.frontend.src.app.tsx.714.15` represent in ClinicOS?

## Canonical Definition

api.consumer.frontend.frontend.src.app.tsx.714.15 is the canonical frontend-api-consumer named loadCartella GET /patients/${pazienteId}/cartella.

## Inputs

HTTP method: `GET`; path template: `/patients/${pazienteId}/cartella`.

## Outputs

Consumes the backend HTTP response.

## Dependencies

Backend route matching is resolved by method and normalized path.

## Side Effects

Performs a browser-originated HTTP request.

## Consumers

Frontend caller: `loadCartella`.

## Invariants

The configured API base URL is applied by the frontend request layer.

## Failure Modes

None observed

## Evidence

- `frontend/src/App.tsx:714-714` — loadCartella

## Related Knowledge

- `belongs-to` → `project.frontend`
