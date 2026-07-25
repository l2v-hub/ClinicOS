---
id: "component.scripts.scripts.nhw.lib.contracts.normalizeid"
kind: "typescript-function"
title: "normalizeId"
status: "observed"
summary: "Exported function from scripts/nhw/lib/contracts.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/contracts.mjs"
    symbol: "normalizeId"
    line_start: "92"
    line_end: "109"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/contracts.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.contracts.normalizeid` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.contracts.normalizeid is the canonical typescript-function named normalizeId.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/lib/knowledge-compiler.mjs`
- `scripts/nhw/lib/repository-extractor.mjs`
- `scripts/nhw/lib/typescript-extractor.mjs`
- `scripts/nhw/test/contracts.test.mjs`

## Invariants

The symbol is exported across its module boundary as `normalizeId`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/contracts.mjs:92-109` — normalizeId

## Related Knowledge

- `belongs-to` → `project.repository-automation`
