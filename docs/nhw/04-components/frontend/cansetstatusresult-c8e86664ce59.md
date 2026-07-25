---
id: "component.frontend.frontend.src.lib.allergystatusmodel.cansetstatusresult"
kind: "typescript-interface"
title: "CanSetStatusResult"
status: "observed"
summary: "Exported interface from frontend/src/lib/allergyStatusModel.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/lib/allergyStatusModel.ts"
    symbol: "CanSetStatusResult"
    line_start: "49"
    line_end: "52"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/allergyStatusModel.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.lib.allergystatusmodel.cansetstatusresult` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.allergystatusmodel.cansetstatusresult is the canonical typescript-interface named CanSetStatusResult.

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

The symbol is exported across its module boundary as `CanSetStatusResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/allergyStatusModel.ts:49-52` — CanSetStatusResult

## Related Knowledge

- `belongs-to` → `project.frontend`
