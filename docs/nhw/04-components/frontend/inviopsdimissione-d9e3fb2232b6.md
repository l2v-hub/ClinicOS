---
id: "component.frontend.frontend.src.components.operator.inviopsmodal.inviopsdimissione"
kind: "typescript-interface"
title: "InvioPSDimissione"
status: "observed"
summary: "Exported interface from frontend/src/components/operator/InvioPSModal.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/InvioPSModal.tsx"
    symbol: "InvioPSDimissione"
    line_start: "42"
    line_end: "54"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.inviopsmodal.inviopsdimissione` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.inviopsmodal.inviopsdimissione is the canonical typescript-interface named InvioPSDimissione.

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

The symbol is exported across its module boundary as `InvioPSDimissione`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/InvioPSModal.tsx:42-54` — InvioPSDimissione

## Related Knowledge

- `belongs-to` → `project.frontend`
