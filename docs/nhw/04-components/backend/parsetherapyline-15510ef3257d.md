---
id: "component.backend.backend.src.intake.parse-discharge-therapy.parsetherapyline"
kind: "typescript-function"
title: "parseTherapyLine"
status: "observed"
summary: "Exported function from backend/src/intake/parse-discharge-therapy.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/intake/parse-discharge-therapy.ts"
    symbol: "parseTherapyLine"
    line_start: "123"
    line_end: "193"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.intake.parse-discharge-therapy.parsetherapyline` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.parse-discharge-therapy.parsetherapyline is the canonical typescript-function named parseTherapyLine.

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

## Invariants

The symbol is exported across its module boundary as `parseTherapyLine`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/parse-discharge-therapy.ts:123-193` — parseTherapyLine

## Related Knowledge

- `belongs-to` → `project.backend`
