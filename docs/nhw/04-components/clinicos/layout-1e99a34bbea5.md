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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
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
