---
id: "component.scripts.scripts.nhw.lib.contracts.stable-id-pattern"
kind: "typescript-constant"
title: "STABLE_ID_PATTERN"
status: "observed"
summary: "Exported constant from scripts/nhw/lib/contracts.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/contracts.mjs"
    symbol: "STABLE_ID_PATTERN"
    line_start: "5"
    line_end: "5"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/contracts.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.contracts.stable-id-pattern` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.contracts.stable-id-pattern is the canonical typescript-constant named STABLE_ID_PATTERN.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/lib/graph.mjs`
- `scripts/nhw/lib/markdown.mjs`
- `scripts/nhw/lib/validator.mjs`

## Invariants

The symbol is exported across its module boundary as `STABLE_ID_PATTERN`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/contracts.mjs:5-5` — STABLE_ID_PATTERN

## Related Knowledge

- `belongs-to` → `project.repository-automation`
