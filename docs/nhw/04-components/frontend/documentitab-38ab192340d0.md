---
id: "component.frontend.frontend.src.components.operator.cartella.documentitab.documentitab"
kind: "typescript-react-component"
title: "DocumentiTab"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/DocumentiTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/DocumentiTab.tsx"
    symbol: "DocumentiTab"
    line_start: "71"
    line_end: "524"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/DocumentiTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.documentitab.documentitab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.documentitab.documentitab is the canonical typescript-react-component named DocumentiTab.

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

The symbol is exported across its module boundary as `DocumentiTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/DocumentiTab.tsx:71-524` — DocumentiTab

## Related Knowledge

- `belongs-to` → `project.frontend`
