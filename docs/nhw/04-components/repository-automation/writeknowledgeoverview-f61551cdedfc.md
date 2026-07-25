---
id: "component.scripts.scripts.nhw.lib.knowledge-pipeline.writeknowledgeoverview"
kind: "typescript-function"
title: "writeKnowledgeOverview"
status: "observed"
summary: "Exported function from scripts/nhw/lib/knowledge-pipeline.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/knowledge-pipeline.mjs"
    symbol: "writeKnowledgeOverview"
    line_start: "269"
    line_end: "288"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.knowledge-pipeline.writeknowledgeoverview` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.knowledge-pipeline.writeknowledgeoverview is the canonical typescript-function named writeKnowledgeOverview.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/generate.mjs`

## Invariants

The symbol is exported across its module boundary as `writeKnowledgeOverview`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/knowledge-pipeline.mjs:269-288` — writeKnowledgeOverview

## Related Knowledge

- `belongs-to` → `project.repository-automation`
