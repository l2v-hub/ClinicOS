---
id: "component.scripts.scripts.nhw.lib.markdown.validateknowledgeunits"
kind: "typescript-function"
title: "validateKnowledgeUnits"
status: "observed"
summary: "Exported function from scripts/nhw/lib/markdown.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/markdown.mjs"
    symbol: "validateKnowledgeUnits"
    line_start: "340"
    line_end: "380"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/markdown.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.markdown.validateknowledgeunits` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.markdown.validateknowledgeunits is the canonical typescript-function named validateKnowledgeUnits.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/lib/validator.mjs`
- `scripts/nhw/test/markdown-graph.test.mjs`

## Invariants

The symbol is exported across its module boundary as `validateKnowledgeUnits`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/markdown.mjs:340-380` — validateKnowledgeUnits

## Related Knowledge

- `belongs-to` → `project.repository-automation`
