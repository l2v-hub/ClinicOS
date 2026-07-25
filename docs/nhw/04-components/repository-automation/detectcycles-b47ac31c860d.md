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
    line_start: "71"
    line_end: "109"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
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
- `scripts/nhw/test/markdown-graph.test.mjs`

## Invariants

The symbol is exported across its module boundary as `detectCycles`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/graph.mjs:71-109` — detectCycles

## Related Knowledge

- `belongs-to` → `project.repository-automation`
