---
id: "component.frontend.frontend.src.lib.legacyanamnesis.legacyanamnesisrows"
kind: "typescript-function"
title: "legacyAnamnesisRows"
status: "observed"
summary: "Exported function from frontend/src/lib/legacyAnamnesis.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/lib/legacyAnamnesis.ts"
    symbol: "legacyAnamnesisRows"
    line_start: "34"
    line_end: "42"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/legacyAnamnesis.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.lib.legacyanamnesis.legacyanamnesisrows` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.legacyanamnesis.legacyanamnesisrows is the canonical typescript-function named legacyAnamnesisRows.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/sections/LegacyAnamnesisView.tsx`
- `frontend/src/lib/__tests__/legacyAnamnesis.test.ts`

## Invariants

The symbol is exported across its module boundary as `legacyAnamnesisRows`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/legacyAnamnesis.ts:34-42` — legacyAnamnesisRows

## Related Knowledge

- `belongs-to` → `project.frontend`
