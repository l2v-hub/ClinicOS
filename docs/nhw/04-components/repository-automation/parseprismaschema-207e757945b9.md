---
id: "component.scripts.scripts.nhw.lib.prisma-extractor.parseprismaschema"
kind: "typescript-function"
title: "parsePrismaSchema"
status: "observed"
summary: "Exported function from scripts/nhw/lib/prisma-extractor.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/prisma-extractor.mjs"
    symbol: "parsePrismaSchema"
    line_start: "103"
    line_end: "179"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.prisma-extractor.parseprismaschema` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.prisma-extractor.parseprismaschema is the canonical typescript-function named parsePrismaSchema.

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

The symbol is exported across its module boundary as `parsePrismaSchema`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/prisma-extractor.mjs:103-179` — parsePrismaSchema

## Related Knowledge

- `belongs-to` → `project.repository-automation`
