---
id: "component.scripts.scripts.nhw.lib.coverage.buildsourcemap"
kind: "typescript-function"
title: "buildSourceMap"
status: "observed"
summary: "Exported function from scripts/nhw/lib/coverage.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/coverage.mjs"
    symbol: "buildSourceMap"
    line_start: "12"
    line_end: "33"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/coverage.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.coverage.buildsourcemap` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.coverage.buildsourcemap is the canonical typescript-function named buildSourceMap.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/lib/knowledge-pipeline.mjs`
- `scripts/nhw/test/coverage-validator.test.mjs`

## Invariants

The symbol is exported across its module boundary as `buildSourceMap`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/coverage.mjs:12-33` — buildSourceMap

## Related Knowledge

- `belongs-to` → `project.repository-automation`
