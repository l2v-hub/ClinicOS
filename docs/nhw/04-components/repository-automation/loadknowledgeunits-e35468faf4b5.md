---
id: "component.scripts.scripts.nhw.lib.knowledge-pipeline.loadknowledgeunits"
kind: "typescript-function"
title: "loadKnowledgeUnits"
status: "observed"
summary: "Exported function from scripts/nhw/lib/knowledge-pipeline.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/knowledge-pipeline.mjs"
    symbol: "loadKnowledgeUnits"
    line_start: "240"
    line_end: "255"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/knowledge-pipeline.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.knowledge-pipeline.loadknowledgeunits` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.knowledge-pipeline.loadknowledgeunits is the canonical typescript-function named loadKnowledgeUnits.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `loadKnowledgeUnits`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/knowledge-pipeline.mjs:240-255` — loadKnowledgeUnits

## Related Knowledge

- `belongs-to` → `project.repository-automation`
