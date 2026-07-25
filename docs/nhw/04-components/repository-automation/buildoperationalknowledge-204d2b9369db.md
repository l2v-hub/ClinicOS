---
id: "component.scripts.scripts.nhw.lib.knowledge-compiler.buildoperationalknowledge"
kind: "typescript-function"
title: "buildOperationalKnowledge"
status: "observed"
summary: "Exported function from scripts/nhw/lib/knowledge-compiler.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/knowledge-compiler.mjs"
    symbol: "buildOperationalKnowledge"
    line_start: "1118"
    line_end: "1291"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/knowledge-compiler.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.knowledge-compiler.buildoperationalknowledge` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.knowledge-compiler.buildoperationalknowledge is the canonical typescript-function named buildOperationalKnowledge.

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
- `scripts/nhw/test/knowledge-compiler.test.mjs`

## Invariants

The symbol is exported across its module boundary as `buildOperationalKnowledge`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/knowledge-compiler.mjs:1118-1291` — buildOperationalKnowledge

## Related Knowledge

- `belongs-to` → `project.repository-automation`
