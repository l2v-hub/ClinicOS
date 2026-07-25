---
id: "component.frontend.frontend.src.lib.entraauth.entraenabled"
kind: "typescript-function"
title: "entraEnabled"
status: "observed"
summary: "Exported function from frontend/src/lib/entraAuth.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/lib/entraAuth.ts"
    symbol: "entraEnabled"
    line_start: "17"
    line_end: "19"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/entraAuth.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.lib.entraauth.entraenabled` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.entraauth.entraenabled is the canonical typescript-function named entraEnabled.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `entraEnabled`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/entraAuth.ts:17-19` — entraEnabled

## Related Knowledge

- `belongs-to` → `project.frontend`
