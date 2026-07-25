---
id: "component.scripts.scripts.nhw.lib.typescript-extractor.extracttypescript"
kind: "typescript-function"
title: "extractTypeScript"
status: "observed"
summary: "Exported function from scripts/nhw/lib/typescript-extractor.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/typescript-extractor.mjs"
    symbol: "extractTypeScript"
    line_start: "549"
    line_end: "619"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/typescript-extractor.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.typescript-extractor.extracttypescript` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.typescript-extractor.extracttypescript is the canonical typescript-function named extractTypeScript.

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
- `scripts/nhw/test/typescript-extractor.test.mjs`

## Invariants

The symbol is exported across its module boundary as `extractTypeScript`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/typescript-extractor.mjs:549-619` — extractTypeScript

## Related Knowledge

- `belongs-to` → `project.repository-automation`
