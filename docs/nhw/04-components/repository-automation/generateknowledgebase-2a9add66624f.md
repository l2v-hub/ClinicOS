---
id: "component.scripts.scripts.nhw.generate.generateknowledgebase"
kind: "typescript-function"
title: "generateKnowledgeBase"
status: "observed"
summary: "Exported function from scripts/nhw/generate.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/generate.mjs"
    symbol: "generateKnowledgeBase"
    line_start: "81"
    line_end: "98"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/generate.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.scripts.scripts.nhw.generate.generateknowledgebase` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.generate.generateknowledgebase is the canonical typescript-function named generateKnowledgeBase.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/test/inventory.test.mjs`
- `scripts/nhw/test/typescript-extractor.test.mjs`

## Invariants

The symbol is exported across its module boundary as `generateKnowledgeBase`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/generate.mjs:81-98` — generateKnowledgeBase

## Related Knowledge

- `belongs-to` → `project.repository-automation`
