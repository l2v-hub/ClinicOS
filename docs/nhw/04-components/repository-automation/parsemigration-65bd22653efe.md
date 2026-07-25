---
id: "component.scripts.scripts.nhw.lib.prisma-extractor.parsemigration"
kind: "typescript-function"
title: "parseMigration"
status: "observed"
summary: "Exported function from scripts/nhw/lib/prisma-extractor.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/prisma-extractor.mjs"
    symbol: "parseMigration"
    line_start: "237"
    line_end: "252"
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
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.prisma-extractor.parsemigration` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.prisma-extractor.parsemigration is the canonical typescript-function named parseMigration.

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

The symbol is exported across its module boundary as `parseMigration`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/prisma-extractor.mjs:237-252` — parseMigration

## Related Knowledge

- `belongs-to` → `project.repository-automation`
