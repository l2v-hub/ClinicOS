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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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
