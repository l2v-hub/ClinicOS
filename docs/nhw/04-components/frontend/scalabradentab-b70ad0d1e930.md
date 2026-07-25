---
id: "component.frontend.frontend.src.components.operator.cartella.scalabradentab.scalabradentab"
kind: "typescript-react-component"
title: "ScalaBradenTab"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/ScalaBradenTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/ScalaBradenTab.tsx"
    symbol: "ScalaBradenTab"
    line_start: "501"
    line_end: "685"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/ScalaBradenTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.scalabradentab.scalabradentab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.scalabradentab.scalabradentab is the canonical typescript-react-component named ScalaBradenTab.

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

The symbol is exported across its module boundary as `ScalaBradenTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/ScalaBradenTab.tsx:501-685` — ScalaBradenTab

## Related Knowledge

- `belongs-to` → `project.frontend`
