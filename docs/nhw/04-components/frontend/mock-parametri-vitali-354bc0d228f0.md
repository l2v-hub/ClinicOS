---
id: "component.frontend.frontend.src.mockdata.mock-parametri-vitali"
kind: "typescript-constant"
title: "MOCK_PARAMETRI_VITALI"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "MOCK_PARAMETRI_VITALI"
    line_start: "776"
    line_end: "807"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/mockData.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.mockdata.mock-parametri-vitali` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.mock-parametri-vitali is the canonical typescript-constant named MOCK_PARAMETRI_VITALI.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `MOCK_PARAMETRI_VITALI`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:776-807` — MOCK_PARAMETRI_VITALI

## Related Knowledge

- `belongs-to` → `project.frontend`
