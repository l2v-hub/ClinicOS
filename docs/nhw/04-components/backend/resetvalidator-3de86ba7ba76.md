---
id: "component.backend.backend.src.ai.extraction-validate.resetvalidator"
kind: "typescript-function"
title: "_resetValidator"
status: "observed"
summary: "Exported function from backend/src/ai/extraction-validate.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/extraction-validate.ts"
    symbol: "_resetValidator"
    line_start: "35"
    line_end: "37"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/extraction-validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.backend.backend.src.ai.extraction-validate.resetvalidator` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.extraction-validate.resetvalidator is the canonical typescript-function named _resetValidator.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `_resetValidator`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/extraction-validate.ts:35-37` — _resetValidator

## Related Knowledge

- `belongs-to` → `project.backend`
