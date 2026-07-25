---
id: "component.backend.backend.src.ai.merge.mergedfield"
kind: "typescript-interface"
title: "MergedField"
status: "observed"
summary: "Exported interface from backend/src/ai/merge.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/merge.ts"
    symbol: "MergedField"
    line_start: "30"
    line_end: "37"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/merge.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.merge.mergedfield` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.merge.mergedfield is the canonical typescript-interface named MergedField.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/merge.test.ts`

## Invariants

The symbol is exported across its module boundary as `MergedField`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/merge.ts:30-37` — MergedField

## Related Knowledge

- `belongs-to` → `project.backend`
