---
id: "component.backend.backend.src.services.consegna-service.createconsegnainput"
kind: "typescript-interface"
title: "CreateConsegnaInput"
status: "observed"
summary: "Exported interface from backend/src/services/consegna-service.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/services/consegna-service.ts"
    symbol: "CreateConsegnaInput"
    line_start: "10"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/services/consegna-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.services.consegna-service.createconsegnainput` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.consegna-service.createconsegnainput is the canonical typescript-interface named CreateConsegnaInput.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `CreateConsegnaInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/consegna-service.ts:10-21` — CreateConsegnaInput

## Related Knowledge

- `belongs-to` → `project.backend`
