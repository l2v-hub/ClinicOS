---
id: "component.frontend.frontend.src.mockdata.mock-agenda"
kind: "typescript-constant"
title: "MOCK_AGENDA"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "MOCK_AGENDA"
    line_start: "289"
    line_end: "339"
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
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.mockdata.mock-agenda` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.mock-agenda is the canonical typescript-constant named MOCK_AGENDA.

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

The symbol is exported across its module boundary as `MOCK_AGENDA`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:289-339` — MOCK_AGENDA

## Related Knowledge

- `belongs-to` → `project.frontend`
