---
id: "component.frontend.frontend.src.components.expcard.expcard"
kind: "typescript-react-component"
title: "ExpCard"
status: "observed"
summary: "Exported react-component from frontend/src/components/ExpCard.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/ExpCard.tsx"
    symbol: "ExpCard"
    line_start: "24"
    line_end: "136"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/ExpCard.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.components.expcard.expcard` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.expcard.expcard is the canonical typescript-react-component named ExpCard.

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

The symbol is exported across its module boundary as `ExpCard`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/ExpCard.tsx:24-136` — ExpCard

## Related Knowledge

- `belongs-to` → `project.frontend`
