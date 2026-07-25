---
id: "component.scripts.scripts.nhw.lib.graph.detectcycles"
kind: "typescript-function"
title: "detectCycles"
status: "observed"
summary: "Exported function from scripts/nhw/lib/graph.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/graph.mjs"
    symbol: "detectCycles"
    line_start: "87"
    line_end: "125"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/graph.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.graph.detectcycles` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.graph.detectcycles is the canonical typescript-function named detectCycles.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/lib/knowledge-pipeline.mjs`
- `scripts/nhw/lib/validator.mjs`
- `scripts/nhw/test/markdown-graph.test.mjs`

## Invariants

The symbol is exported across its module boundary as `detectCycles`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/graph.mjs:87-125` — detectCycles

## Related Knowledge

- `belongs-to` → `project.repository-automation`
