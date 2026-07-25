---
id: "component.frontend.frontend.src.components.operator.cartella.shared.fmtdatetime"
kind: "typescript-function"
title: "fmtDateTime"
status: "observed"
summary: "Exported function from frontend/src/components/operator/cartella/shared.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/shared.tsx"
    symbol: "fmtDateTime"
    line_start: "21"
    line_end: "29"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/shared.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.shared.fmtdatetime` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.shared.fmtdatetime is the canonical typescript-function named fmtDateTime.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/sections/AnamnesisEditor.tsx`
- `frontend/src/components/operator/sections/LegacyAnamnesisView.tsx`

## Invariants

The symbol is exported across its module boundary as `fmtDateTime`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/shared.tsx:21-29` — fmtDateTime

## Related Knowledge

- `belongs-to` → `project.frontend`
