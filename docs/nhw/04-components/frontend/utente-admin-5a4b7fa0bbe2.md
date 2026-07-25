---
id: "component.frontend.frontend.src.mockdata.utente-admin"
kind: "typescript-constant"
title: "UTENTE_ADMIN"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "UTENTE_ADMIN"
    line_start: "92"
    line_end: "98"
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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.mockdata.utente-admin` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.utente-admin is the canonical typescript-constant named UTENTE_ADMIN.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/Login.tsx`

## Invariants

The symbol is exported across its module boundary as `UTENTE_ADMIN`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:92-98` — UTENTE_ADMIN

## Related Knowledge

- `belongs-to` → `project.frontend`
