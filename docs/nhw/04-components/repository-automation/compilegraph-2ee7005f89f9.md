---
id: "component.scripts.scripts.nhw.lib.graph.compilegraph"
kind: "typescript-function"
title: "compileGraph"
status: "observed"
summary: "Exported function from scripts/nhw/lib/graph.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/graph.mjs"
    symbol: "compileGraph"
    line_start: "7"
    line_end: "62"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.graph.compilegraph` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.graph.compilegraph is the canonical typescript-function named compileGraph.

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
- `scripts/nhw/test/coverage-validator.test.mjs`
- `scripts/nhw/test/markdown-graph.test.mjs`

## Invariants

The symbol is exported across its module boundary as `compileGraph`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/graph.mjs:7-62` — compileGraph

## Related Knowledge

- `belongs-to` → `project.repository-automation`
