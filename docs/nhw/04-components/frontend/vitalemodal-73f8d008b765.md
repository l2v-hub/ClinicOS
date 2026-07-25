---
id: "component.frontend.frontend.src.components.operator.cartella.vitalemodal.vitalemodal"
kind: "typescript-react-component"
title: "VitaleModal"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/VitaleModal.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/VitaleModal.tsx"
    symbol: "VitaleModal"
    line_start: "37"
    line_end: "311"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/VitaleModal.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.vitalemodal.vitalemodal` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.vitalemodal.vitalemodal is the canonical typescript-react-component named VitaleModal.

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

The symbol is exported across its module boundary as `VitaleModal`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/VitaleModal.tsx:37-311` — VitaleModal

## Related Knowledge

- `belongs-to` → `project.frontend`
