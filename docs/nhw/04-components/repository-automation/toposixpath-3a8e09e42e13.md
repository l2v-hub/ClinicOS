---
id: 'component.scripts.scripts.nhw.lib.contracts.toposixpath'
kind: 'typescript-function'
title: 'toPosixPath'
status: 'observed'
summary: 'Exported function from scripts/nhw/lib/contracts.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'scripts/nhw/lib/contracts.mjs'
    symbol: 'toPosixPath'
    line_start: '141'
    line_end: '143'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.repository-automation'
    evidence: 'scripts/nhw/lib/contracts.mjs'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.contracts.toposixpath` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.contracts.toposixpath is the canonical typescript-function named toPosixPath.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/lib/inventory.mjs`
- `scripts/nhw/lib/typescript-extractor.mjs`

## Invariants

The symbol is exported across its module boundary as `toPosixPath`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/contracts.mjs:141-143` — toPosixPath

## Related Knowledge

- `belongs-to` → `project.repository-automation`
