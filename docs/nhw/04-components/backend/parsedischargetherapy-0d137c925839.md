---
id: "component.backend.backend.src.intake.parse-discharge-therapy.parsedischargetherapy"
kind: "typescript-function"
title: "parseDischargeTherapy"
status: "observed"
summary: "Exported function from backend/src/intake/parse-discharge-therapy.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/intake/parse-discharge-therapy.ts"
    symbol: "parseDischargeTherapy"
    line_start: "200"
    line_end: "210"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/intake/parse-discharge-therapy.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.intake.parse-discharge-therapy.parsedischargetherapy` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.parse-discharge-therapy.parsedischargetherapy is the canonical typescript-function named parseDischargeTherapy.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/intake/__tests__/parse-discharge-therapy.test.ts`
- `backend/src/intake/draft-service.ts`

## Invariants

The symbol is exported across its module boundary as `parseDischargeTherapy`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/parse-discharge-therapy.ts:200-210` — parseDischargeTherapy

## Related Knowledge

- `belongs-to` → `project.backend`
