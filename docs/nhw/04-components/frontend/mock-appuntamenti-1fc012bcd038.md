---
id: "component.frontend.frontend.src.mockdata.mock-appuntamenti"
kind: "typescript-constant"
title: "MOCK_APPUNTAMENTI"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "MOCK_APPUNTAMENTI"
    line_start: "343"
    line_end: "484"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.mockdata.mock-appuntamenti` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.mock-appuntamenti is the canonical typescript-constant named MOCK_APPUNTAMENTI.

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

The symbol is exported across its module boundary as `MOCK_APPUNTAMENTI`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:343-484` — MOCK_APPUNTAMENTI

## Related Knowledge

- `belongs-to` → `project.frontend`
