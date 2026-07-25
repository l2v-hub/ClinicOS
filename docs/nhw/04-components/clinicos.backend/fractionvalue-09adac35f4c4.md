---
id: "component.backend.backend.src.lib.therapy-dose.fractionvalue"
kind: "typescript-function"
title: "fractionValue"
status: "observed"
summary: "Exported function from backend/src/lib/therapy-dose.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/lib/therapy-dose.ts"
    symbol: "fractionValue"
    line_start: "59"
    line_end: "61"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/lib/therapy-dose.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.lib.therapy-dose.fractionvalue` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.therapy-dose.fractionvalue is the canonical typescript-function named fractionValue.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `fractionValue`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/therapy-dose.ts:59-61` — fractionValue

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
