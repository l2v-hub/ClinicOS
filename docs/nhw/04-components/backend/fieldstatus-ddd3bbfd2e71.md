---
id: "component.backend.backend.src.ai.merge.fieldstatus"
kind: "typescript-type-alias"
title: "FieldStatus"
status: "observed"
summary: "Exported type-alias from backend/src/ai/merge.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/merge.ts"
    symbol: "FieldStatus"
    line_start: "13"
    line_end: "14"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/merge.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.merge.fieldstatus` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.merge.fieldstatus is the canonical typescript-type-alias named FieldStatus.

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

The symbol is exported across its module boundary as `FieldStatus`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/merge.ts:13-14` — FieldStatus

## Related Knowledge

- `belongs-to` → `project.backend`
