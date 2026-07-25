---
id: "component.backend.backend.src.intake.parse-discharge-therapy.parsedtherapyrow"
kind: "typescript-interface"
title: "ParsedTherapyRow"
status: "observed"
summary: "Exported interface from backend/src/intake/parse-discharge-therapy.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/intake/parse-discharge-therapy.ts"
    symbol: "ParsedTherapyRow"
    line_start: "7"
    line_end: "20"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/intake/parse-discharge-therapy.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.intake.parse-discharge-therapy.parsedtherapyrow` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.intake.parse-discharge-therapy.parsedtherapyrow is the canonical typescript-interface named ParsedTherapyRow.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `ParsedTherapyRow`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/intake/parse-discharge-therapy.ts:7-20` — ParsedTherapyRow

## Related Knowledge

- `belongs-to` → `project.backend`
