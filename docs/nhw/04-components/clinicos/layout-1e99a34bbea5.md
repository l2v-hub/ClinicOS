---
id: "component.src.src.components.layout.layout"
kind: "typescript-react-component"
title: "Layout"
status: "observed"
summary: "Exported react-component from src/components/Layout.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "src/components/Layout.tsx"
    symbol: "Layout"
    line_start: "3"
    line_end: "44"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "src/components/Layout.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.src.src.components.layout.layout` represent in ClinicOS?

## Canonical Definition

component.src.src.components.layout.layout is the canonical typescript-react-component named Layout.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `Layout`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `src/components/Layout.tsx:3-44` — Layout

## Related Knowledge

- `belongs-to` → `project.clinicos`
