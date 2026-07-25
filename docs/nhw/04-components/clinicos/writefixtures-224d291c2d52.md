---
id: "component.e2e.e2e.fixtures.writefixtures"
kind: "typescript-function"
title: "writeFixtures"
status: "observed"
summary: "Exported function from e2e/fixtures.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "e2e/fixtures.mjs"
    symbol: "writeFixtures"
    line_start: "29"
    line_end: "44"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "e2e/fixtures.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.e2e.e2e.fixtures.writefixtures` represent in ClinicOS?

## Canonical Definition

component.e2e.e2e.fixtures.writefixtures is the canonical typescript-function named writeFixtures.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos`.

## Side Effects

None observed

## Consumers

- `e2e/async-shot.mjs`
- `e2e/import-happy-path.mjs`
- `e2e/issue-127-verify.mjs`

## Invariants

The symbol is exported across its module boundary as `writeFixtures`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `e2e/fixtures.mjs:29-44` — writeFixtures

## Related Knowledge

- `belongs-to` → `project.clinicos`
