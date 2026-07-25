---
id: "component.backend.backend.src.ai.merge.mergeoptions"
kind: "typescript-interface"
title: "MergeOptions"
status: "observed"
summary: "Exported interface from backend/src/ai/merge.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/merge.ts"
    symbol: "MergeOptions"
    line_start: "75"
    line_end: "78"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.backend.backend.src.ai.merge.mergeoptions` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.merge.mergeoptions is the canonical typescript-interface named MergeOptions.

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

The symbol is exported across its module boundary as `MergeOptions`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/merge.ts:75-78` — MergeOptions

## Related Knowledge

- `belongs-to` → `project.backend`
