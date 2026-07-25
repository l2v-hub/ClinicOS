---
id: "component.frontend.frontend.src.components.operator.cartella.diariopazientetab.diariopazientetab"
kind: "typescript-react-component"
title: "DiarioPazienteTab"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/DiarioPazienteTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/DiarioPazienteTab.tsx"
    symbol: "DiarioPazienteTab"
    line_start: "150"
    line_end: "619"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/DiarioPazienteTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.diariopazientetab.diariopazientetab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.diariopazientetab.diariopazientetab is the canonical typescript-react-component named DiarioPazienteTab.

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

The symbol is exported across its module boundary as `DiarioPazienteTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx:150-619` — DiarioPazienteTab

## Related Knowledge

- `belongs-to` → `project.frontend`
