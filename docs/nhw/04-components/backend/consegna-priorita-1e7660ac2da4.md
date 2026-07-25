---
id: "component.backend.backend.src.services.consegna-service.consegna-priorita"
kind: "typescript-constant"
title: "CONSEGNA_PRIORITA"
status: "observed"
summary: "Exported constant from backend/src/services/consegna-service.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/services/consegna-service.ts"
    symbol: "CONSEGNA_PRIORITA"
    line_start: "7"
    line_end: "7"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/services/consegna-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.services.consegna-service.consegna-priorita` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.consegna-service.consegna-priorita is the canonical typescript-constant named CONSEGNA_PRIORITA.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/consegne.ts`

## Invariants

The symbol is exported across its module boundary as `CONSEGNA_PRIORITA`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/consegna-service.ts:7-7` — CONSEGNA_PRIORITA

## Related Knowledge

- `belongs-to` → `project.backend`
