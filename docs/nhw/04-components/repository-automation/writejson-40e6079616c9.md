---
id: 'component.scripts.scripts.nhw.lib.contracts.writejson'
kind: 'typescript-function'
title: 'writeJson'
status: 'observed'
summary: 'Exported function from scripts/nhw/lib/contracts.mjs.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'scripts/nhw/lib/contracts.mjs'
    symbol: 'writeJson'
    line_start: '168'
    line_end: '170'
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
  inventory_hash: '57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c'
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.contracts.writejson` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.contracts.writejson is the canonical typescript-function named writeJson.

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

The symbol is exported across its module boundary as `writeJson`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/contracts.mjs:168-170` — writeJson

## Related Knowledge

- `belongs-to` → `project.repository-automation`
