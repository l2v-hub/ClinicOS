---
id: "component.scripts.scripts.nhw.lib.contracts.writejsonl"
kind: "typescript-function"
title: "writeJsonl"
status: "observed"
summary: "Exported function from scripts/nhw/lib/contracts.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/contracts.mjs"
    symbol: "writeJsonl"
    line_start: "172"
    line_end: "180"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/contracts.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.contracts.writejsonl` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.contracts.writejsonl is the canonical typescript-function named writeJsonl.

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
- `scripts/nhw/lib/knowledge-pipeline.mjs`

## Invariants

The symbol is exported across its module boundary as `writeJsonl`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/contracts.mjs:172-180` — writeJsonl

## Related Knowledge

- `belongs-to` → `project.repository-automation`
