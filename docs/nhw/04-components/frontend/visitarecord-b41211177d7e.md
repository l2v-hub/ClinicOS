---
id: "component.frontend.frontend.src.types.visitarecord"
kind: "typescript-interface"
title: "VisitaRecord"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "VisitaRecord"
    line_start: "405"
    line_end: "415"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.types.visitarecord` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.visitarecord is the canonical typescript-interface named VisitaRecord.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `VisitaRecord`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:405-415` — VisitaRecord

## Related Knowledge

- `belongs-to` → `project.frontend`
