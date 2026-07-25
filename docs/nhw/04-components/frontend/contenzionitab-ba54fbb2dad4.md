---
id: "component.frontend.frontend.src.components.operator.cartella.contenzionitab.contenzionitab"
kind: "typescript-react-component"
title: "ContenzioniTab"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/ContenzioniTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/ContenzioniTab.tsx"
    symbol: "ContenzioniTab"
    line_start: "362"
    line_end: "962"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/ContenzioniTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.contenzionitab.contenzionitab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.contenzionitab.contenzionitab is the canonical typescript-react-component named ContenzioniTab.

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

The symbol is exported across its module boundary as `ContenzioniTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/ContenzioniTab.tsx:362-962` — ContenzioniTab

## Related Knowledge

- `belongs-to` → `project.frontend`
