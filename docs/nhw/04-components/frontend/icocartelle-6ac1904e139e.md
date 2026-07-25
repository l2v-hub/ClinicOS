---
id: "component.frontend.frontend.src.icons.icocartelle"
kind: "typescript-react-component"
title: "IcoCartelle"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoCartelle"
    line_start: "48"
    line_end: "62"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/icons.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icocartelle` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icocartelle is the canonical typescript-react-component named IcoCartelle.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/PatientDetail.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoCartelle`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:48-62` — IcoCartelle

## Related Knowledge

- `belongs-to` → `project.frontend`
