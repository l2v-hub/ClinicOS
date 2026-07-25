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
    line_start: "442"
    line_end: "538"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

- `scripts/nhw/lib/validator.mjs:442-538` — validateKnowledgeBase

## Related Knowledge

- `belongs-to` → `project.repository-automation`
