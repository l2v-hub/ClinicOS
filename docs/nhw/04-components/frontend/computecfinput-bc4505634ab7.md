---
id: "component.frontend.frontend.src.lib.codicefiscale.computecfinput"
kind: "typescript-interface"
title: "ComputeCFInput"
status: "observed"
summary: "Exported interface from frontend/src/lib/codiceFiscale.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/lib/codiceFiscale.ts"
    symbol: "ComputeCFInput"
    line_start: "21"
    line_end: "30"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/codiceFiscale.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.lib.codicefiscale.computecfinput` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.codicefiscale.computecfinput is the canonical typescript-interface named ComputeCFInput.

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

The symbol is exported across its module boundary as `ComputeCFInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/codiceFiscale.ts:21-30` — ComputeCFInput

## Related Knowledge

- `belongs-to` → `project.frontend`
