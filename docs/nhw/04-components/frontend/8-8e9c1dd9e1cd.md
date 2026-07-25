---
id: "api.consumer.frontend.frontend.src.app.tsx.516.8"
kind: "frontend-api-consumer"
title: "addOperatore POST /operators"
status: "observed"
summary: "Frontend request issued by addOperatore."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/App.tsx"
    symbol: "addOperatore"
    line_start: "516"
    line_end: "520"
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `api.consumer.frontend.frontend.src.app.tsx.516.8` represent in ClinicOS?

## Canonical Definition

api.consumer.frontend.frontend.src.app.tsx.516.8 is the canonical frontend-api-consumer named addOperatore POST /operators.

## Inputs

HTTP method: `POST`; path template: `/operators`.

## Outputs

Consumes the backend HTTP response.

## Dependencies

Backend route matching is resolved by method and normalized path.

## Side Effects

Performs a browser-originated HTTP request.

## Consumers

Frontend caller: `addOperatore`.

## Invariants

The configured API base URL is applied by the frontend request layer.

## Failure Modes

None observed

## Evidence

- `frontend/src/App.tsx:516-520` — addOperatore

## Related Knowledge

- `belongs-to` → `project.frontend`
