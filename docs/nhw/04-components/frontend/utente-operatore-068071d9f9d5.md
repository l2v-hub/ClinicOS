---
id: "component.frontend.frontend.src.mockdata.utente-operatore"
kind: "typescript-constant"
title: "UTENTE_OPERATORE"
status: "observed"
summary: "Exported constant from frontend/src/mockData.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "UTENTE_OPERATORE"
    line_start: "100"
    line_end: "106"
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

What does `component.frontend.frontend.src.mockdata.utente-operatore` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.utente-operatore is the canonical typescript-constant named UTENTE_OPERATORE.

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

The symbol is exported across its module boundary as `UTENTE_OPERATORE`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:100-106` — UTENTE_OPERATORE

## Related Knowledge

- `belongs-to` → `project.frontend`
