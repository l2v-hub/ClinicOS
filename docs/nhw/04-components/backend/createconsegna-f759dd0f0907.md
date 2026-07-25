---
id: "component.backend.backend.src.services.consegna-service.createconsegna"
kind: "typescript-function"
title: "createConsegna"
status: "observed"
summary: "Exported function from backend/src/services/consegna-service.ts."
bounded_contexts:
  - "context.operator-collaboration"
sources:
  - path: "backend/src/services/consegna-service.ts"
    symbol: "createConsegna"
    line_start: "24"
    line_end: "44"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/services/consegna-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.services.consegna-service.createconsegna` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.services.consegna-service.createconsegna is the canonical typescript-function named createConsegna.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/voice/write-services.ts`
- `backend/src/routes/consegne.ts`

## Invariants

The symbol is exported across its module boundary as `createConsegna`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/services/consegna-service.ts:24-44` — createConsegna

## Related Knowledge

- `belongs-to` → `project.backend`
