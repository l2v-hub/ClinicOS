---
id: "component.scripts.scripts.nhw.lib.inventory.inventoryhash"
kind: "typescript-function"
title: "inventoryHash"
status: "observed"
summary: "Exported function from scripts/nhw/lib/inventory.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/inventory.mjs"
    symbol: "inventoryHash"
    line_start: "301"
    line_end: "308"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/inventory.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.inventory.inventoryhash` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.inventory.inventoryhash is the canonical typescript-function named inventoryHash.

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
- `scripts/nhw/lib/coverage.mjs`
- `scripts/nhw/lib/validator.mjs`
- `scripts/nhw/test/inventory.test.mjs`

## Invariants

The symbol is exported across its module boundary as `inventoryHash`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/inventory.mjs:301-308` — inventoryHash

## Related Knowledge

- `belongs-to` → `project.repository-automation`
