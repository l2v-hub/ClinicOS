---
id: "component.scripts.scripts.nhw.lib.graph.findorphans"
kind: "typescript-function"
title: "findOrphans"
status: "observed"
summary: "Exported function from scripts/nhw/lib/graph.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/graph.mjs"
    symbol: "findOrphans"
    line_start: "127"
    line_end: "137"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.graph.findorphans` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.graph.findorphans is the canonical typescript-function named findOrphans.

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

The symbol is exported across its module boundary as `findOrphans`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/graph.mjs:127-137` — findOrphans

## Related Knowledge

- `belongs-to` → `project.repository-automation`
