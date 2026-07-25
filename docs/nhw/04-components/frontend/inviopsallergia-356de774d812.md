---
id: "component.frontend.frontend.src.components.operator.inviopsmodal.inviopsallergia"
kind: "typescript-interface"
title: "InvioPSAllergia"
status: "observed"
summary: "Exported interface from frontend/src/components/operator/InvioPSModal.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/InvioPSModal.tsx"
    symbol: "InvioPSAllergia"
    line_start: "25"
    line_end: "28"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/InvioPSModal.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.inviopsmodal.inviopsallergia` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.inviopsmodal.inviopsallergia is the canonical typescript-interface named InvioPSAllergia.

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

The symbol is exported across its module boundary as `InvioPSAllergia`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/InvioPSModal.tsx:25-28` — InvioPSAllergia

## Related Knowledge

- `belongs-to` → `project.frontend`
