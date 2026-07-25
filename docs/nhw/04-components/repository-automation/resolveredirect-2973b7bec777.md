---
id: "component.scripts.scripts.nhw.lib.graph.resolveredirect"
kind: "typescript-function"
title: "resolveRedirect"
status: "observed"
summary: "Exported function from scripts/nhw/lib/graph.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/graph.mjs"
    symbol: "resolveRedirect"
    line_start: "139"
    line_end: "152"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/graph.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.graph.resolveredirect` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.graph.resolveredirect is the canonical typescript-function named resolveRedirect.

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

The symbol is exported across its module boundary as `resolveRedirect`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/graph.mjs:139-152` — resolveRedirect

## Related Knowledge

- `belongs-to` → `project.repository-automation`
