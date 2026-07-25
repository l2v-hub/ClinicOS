---
id: "component.scripts.scripts.nhw.lib.knowledge-pipeline.compileknowledgeartifacts"
kind: "typescript-function"
title: "compileKnowledgeArtifacts"
status: "observed"
summary: "Exported function from scripts/nhw/lib/knowledge-pipeline.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/knowledge-pipeline.mjs"
    symbol: "compileKnowledgeArtifacts"
    line_start: "256"
    line_end: "315"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.knowledge-pipeline.compileknowledgeartifacts` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.knowledge-pipeline.compileknowledgeartifacts is the canonical typescript-function named compileKnowledgeArtifacts.

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

The symbol is exported across its module boundary as `compileKnowledgeArtifacts`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/knowledge-pipeline.mjs:256-315` — compileKnowledgeArtifacts

## Related Knowledge

- `belongs-to` → `project.repository-automation`
