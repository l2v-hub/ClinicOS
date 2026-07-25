---
id: "component.frontend.frontend.src.types.esameclinicorecord"
kind: "typescript-interface"
title: "EsameClinicoRecord"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "EsameClinicoRecord"
    line_start: "393"
    line_end: "403"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.types.esameclinicorecord` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.esameclinicorecord is the canonical typescript-interface named EsameClinicoRecord.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/EsamiConsulenzeTab.tsx`

## Invariants

The symbol is exported across its module boundary as `EsameClinicoRecord`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:393-403` — EsameClinicoRecord

## Related Knowledge

- `belongs-to` → `project.frontend`
