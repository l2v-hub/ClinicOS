---
id: "component.backend.backend.src.lib.therapy-dose.scheduledoseshort"
kind: "typescript-function"
title: "scheduleDoseShort"
status: "observed"
summary: "Exported function from backend/src/lib/therapy-dose.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/lib/therapy-dose.ts"
    symbol: "scheduleDoseShort"
    line_start: "86"
    line_end: "100"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.lib.therapy-dose.scheduledoseshort` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.therapy-dose.scheduledoseshort is the canonical typescript-function named scheduleDoseShort.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/patient-therapies.ts`

## Invariants

The symbol is exported across its module boundary as `scheduleDoseShort`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/therapy-dose.ts:86-100` — scheduleDoseShort

## Related Knowledge

- `belongs-to` → `project.backend`
