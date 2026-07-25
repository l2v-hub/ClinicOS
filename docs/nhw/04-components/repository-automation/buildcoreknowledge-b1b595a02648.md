---
id: "component.scripts.scripts.nhw.lib.knowledge-compiler.buildcoreknowledge"
kind: "typescript-function"
title: "buildCoreKnowledge"
status: "observed"
summary: "Exported function from scripts/nhw/lib/knowledge-compiler.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/knowledge-compiler.mjs"
    symbol: "buildCoreKnowledge"
    line_start: "1670"
    line_end: "1685"
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
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.knowledge-compiler.buildcoreknowledge` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.knowledge-compiler.buildcoreknowledge is the canonical typescript-function named buildCoreKnowledge.

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

The symbol is exported across its module boundary as `buildCoreKnowledge`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/knowledge-compiler.mjs:1670-1685` — buildCoreKnowledge

## Related Knowledge

- `belongs-to` → `project.repository-automation`
