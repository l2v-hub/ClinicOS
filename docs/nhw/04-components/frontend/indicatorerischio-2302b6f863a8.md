---
id: "component.frontend.frontend.src.types.indicatorerischio"
kind: "typescript-interface"
title: "IndicatoreRischio"
status: "observed"
summary: "Exported interface from frontend/src/types.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/types.ts"
    symbol: "IndicatoreRischio"
    line_start: "439"
    line_end: "446"
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
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.types.indicatorerischio` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.types.indicatorerischio is the canonical typescript-interface named IndicatoreRischio.

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

The symbol is exported across its module boundary as `IndicatoreRischio`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/types.ts:439-446` — IndicatoreRischio

## Related Knowledge

- `belongs-to` → `project.frontend`
