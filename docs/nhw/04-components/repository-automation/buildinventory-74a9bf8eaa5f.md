---
id: "component.scripts.scripts.nhw.lib.inventory.buildinventory"
kind: "typescript-function"
title: "buildInventory"
status: "observed"
summary: "Exported function from scripts/nhw/lib/inventory.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/inventory.mjs"
    symbol: "buildInventory"
    line_start: "238"
    line_end: "299"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.inventory.buildinventory` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.inventory.buildinventory is the canonical typescript-function named buildInventory.

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
- `scripts/nhw/lib/validator.mjs`
- `scripts/nhw/test/inventory.test.mjs`
- `scripts/nhw/test/repository-extractor.test.mjs`

## Invariants

The symbol is exported across its module boundary as `buildInventory`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/inventory.mjs:238-299` — buildInventory

## Related Knowledge

- `belongs-to` → `project.repository-automation`
