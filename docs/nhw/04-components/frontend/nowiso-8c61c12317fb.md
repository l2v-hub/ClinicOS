---
id: "component.frontend.frontend.src.components.operator.cartella.shared.nowiso"
kind: "typescript-function"
title: "nowISO"
status: "observed"
summary: "Exported function from frontend/src/components/operator/cartella/shared.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/shared.tsx"
    symbol: "nowISO"
    line_start: "7"
    line_end: "9"
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
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.shared.nowiso` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.shared.nowiso is the canonical typescript-function named nowISO.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/ContenzioniTab.tsx`
- `frontend/src/components/operator/cartella/DimissioneTab.tsx`
- `frontend/src/components/operator/cartella/EsamiConsulenzeTab.tsx`
- `frontend/src/components/operator/cartella/MedicazioniTab.tsx`
- `frontend/src/components/operator/cartella/ParametriTab.tsx`
- `frontend/src/components/operator/cartella/PresaInCaricoTab.tsx`
- `frontend/src/components/operator/cartella/ScalaBradenTab.tsx`
- `frontend/src/components/operator/cartella/ScalaNRSTab.tsx`
- `frontend/src/components/operator/cartella/ScalaTinettiTab.tsx`
- `frontend/src/components/operator/sections/AnamnesisEditor.tsx`
- `frontend/src/components/operator/sections/DiagnosisEditor.tsx`

## Invariants

The symbol is exported across its module boundary as `nowISO`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/shared.tsx:7-9` — nowISO

## Related Knowledge

- `belongs-to` → `project.frontend`
