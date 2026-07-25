---
id: "component.scripts.scripts.nhw.lib.validator.validateknowledgebase"
kind: "typescript-function"
title: "validateKnowledgeBase"
status: "observed"
summary: "Exported function from scripts/nhw/lib/validator.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/validator.mjs"
    symbol: "validateKnowledgeBase"
    line_start: "138"
    line_end: "181"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/validator.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.validator.validateknowledgebase` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.validator.validateknowledgebase is the canonical typescript-function named validateKnowledgeBase.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/validate.mjs`

## Invariants

The symbol is exported across its module boundary as `validateKnowledgeBase`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/validator.mjs:138-181` — validateKnowledgeBase

## Related Knowledge

- `belongs-to` → `project.repository-automation`
