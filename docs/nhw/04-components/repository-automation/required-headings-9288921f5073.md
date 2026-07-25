---
id: "component.scripts.scripts.nhw.lib.markdown.required-headings"
kind: "typescript-constant"
title: "REQUIRED_HEADINGS"
status: "observed"
summary: "Exported constant from scripts/nhw/lib/markdown.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/markdown.mjs"
    symbol: "REQUIRED_HEADINGS"
    line_start: "3"
    line_end: "15"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/markdown.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.markdown.required-headings` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.markdown.required-headings is the canonical typescript-constant named REQUIRED_HEADINGS.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/lib/knowledge-compiler.mjs`
- `scripts/nhw/test/coverage-validator.test.mjs`
- `scripts/nhw/test/markdown-graph.test.mjs`

## Invariants

The symbol is exported across its module boundary as `REQUIRED_HEADINGS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/markdown.mjs:3-15` — REQUIRED_HEADINGS

## Related Knowledge

- `belongs-to` → `project.repository-automation`
