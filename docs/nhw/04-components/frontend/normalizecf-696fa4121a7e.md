---
id: "component.frontend.frontend.src.lib.codicefiscale.normalizecf"
kind: "typescript-function"
title: "normalizeCF"
status: "observed"
summary: "Exported function from frontend/src/lib/codiceFiscale.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/lib/codiceFiscale.ts"
    symbol: "normalizeCF"
    line_start: "7"
    line_end: "9"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/codiceFiscale.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.lib.codicefiscale.normalizecf` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.codicefiscale.normalizecf is the canonical typescript-function named normalizeCF.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `normalizeCF`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/codiceFiscale.ts:7-9` — normalizeCF

## Related Knowledge

- `belongs-to` → `project.frontend`
