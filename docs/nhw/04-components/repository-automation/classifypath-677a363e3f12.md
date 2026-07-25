---
id: 'component.scripts.scripts.nhw.lib.inventory.classifypath'
kind: 'typescript-function'
title: 'classifyPath'
status: 'observed'
summary: 'Exported function from scripts/nhw/lib/inventory.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'scripts/nhw/lib/inventory.mjs'
    symbol: 'classifyPath'
    line_start: '64'
    line_end: '180'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.repository-automation'
    evidence: 'scripts/nhw/lib/inventory.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.inventory.classifypath` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.inventory.classifypath is the canonical typescript-function named classifyPath.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/test/inventory.test.mjs`

## Invariants

The symbol is exported across its module boundary as `classifyPath`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/inventory.mjs:64-180` — classifyPath

## Related Knowledge

- `belongs-to` → `project.repository-automation`
