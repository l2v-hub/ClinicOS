---
id: "component.frontend.frontend.src.lib.legacyanamnesis.legacyanamnesisrow"
kind: "typescript-type-alias"
title: "LegacyAnamnesisRow"
status: "observed"
summary: "Exported type-alias from frontend/src/lib/legacyAnamnesis.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/lib/legacyAnamnesis.ts"
    symbol: "LegacyAnamnesisRow"
    line_start: "8"
    line_end: "8"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/legacyAnamnesis.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.lib.legacyanamnesis.legacyanamnesisrow` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.legacyanamnesis.legacyanamnesisrow is the canonical typescript-type-alias named LegacyAnamnesisRow.

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

The symbol is exported across its module boundary as `LegacyAnamnesisRow`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/legacyAnamnesis.ts:8-8` — LegacyAnamnesisRow

## Related Knowledge

- `belongs-to` → `project.frontend`
