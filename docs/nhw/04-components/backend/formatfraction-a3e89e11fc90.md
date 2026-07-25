---
id: "component.backend.backend.src.lib.therapy-dose.formatfraction"
kind: "typescript-function"
title: "formatFraction"
status: "observed"
summary: "Exported function from backend/src/lib/therapy-dose.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/lib/therapy-dose.ts"
    symbol: "formatFraction"
    line_start: "52"
    line_end: "56"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/lib/therapy-dose.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.lib.therapy-dose.formatfraction` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.therapy-dose.formatfraction is the canonical typescript-function named formatFraction.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/therapy-dose.test.ts`

## Invariants

The symbol is exported across its module boundary as `formatFraction`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/therapy-dose.ts:52-56` — formatFraction

## Related Knowledge

- `belongs-to` → `project.backend`
