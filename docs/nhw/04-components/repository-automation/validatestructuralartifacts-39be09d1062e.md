---
id: "component.scripts.scripts.nhw.lib.validator.validatestructuralartifacts"
kind: "typescript-function"
title: "validateStructuralArtifacts"
status: "observed"
summary: "Exported function from scripts/nhw/lib/validator.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "scripts/nhw/lib/validator.mjs"
    symbol: "validateStructuralArtifacts"
    line_start: "144"
    line_end: "392"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.repository-automation"
    evidence: "scripts/nhw/lib/validator.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.scripts.scripts.nhw.lib.validator.validatestructuralartifacts` represent in ClinicOS?

## Canonical Definition

component.scripts.scripts.nhw.lib.validator.validatestructuralartifacts is the canonical typescript-function named validateStructuralArtifacts.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.repository-automation`.

## Side Effects

None observed

## Consumers

- `scripts/nhw/test/coverage-validator.test.mjs`

## Invariants

The symbol is exported across its module boundary as `validateStructuralArtifacts`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `scripts/nhw/lib/validator.mjs:144-392` — validateStructuralArtifacts

## Related Knowledge

- `belongs-to` → `project.repository-automation`
