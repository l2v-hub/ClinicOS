---
id: "component.scripts.scripts.nhw.lib.prisma-extractor.buildmigrationlineage"
kind: "typescript-function"
title: "buildMigrationLineage"
status: "observed"
summary: "Exported function from scripts/nhw/lib/prisma-extractor.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/prisma-extractor.mjs"
    symbol: "buildMigrationLineage"
    line_start: "254"
    line_end: "269"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/prisma-extractor.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.prisma-extractor.buildmigrationlineage` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.prisma-extractor.buildmigrationlineage is the canonical typescript-function named buildMigrationLineage.

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
- `scripts/nhw/test/prisma-extractor.test.mjs`

## Invariants

The symbol is exported across its module boundary as `buildMigrationLineage`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/prisma-extractor.mjs:254-269` — buildMigrationLineage

## Related Knowledge

- `belongs-to` → `project.repository-automation`
