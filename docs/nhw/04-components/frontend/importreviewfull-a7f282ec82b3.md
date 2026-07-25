---
id: "component.frontend.frontend.src.components.shared.importreviewfull.importreviewfull"
kind: "typescript-react-component"
title: "ImportReviewFull"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/ImportReviewFull.tsx."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/ImportReviewFull.tsx"
    symbol: "ImportReviewFull"
    line_start: "131"
    line_end: "892"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/ImportReviewFull.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.importreviewfull.importreviewfull` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.importreviewfull.importreviewfull is the canonical typescript-react-component named ImportReviewFull.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `ImportReviewFull`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/ImportReviewFull.tsx:131-892` — ImportReviewFull

## Related Knowledge

- `belongs-to` → `project.frontend`
