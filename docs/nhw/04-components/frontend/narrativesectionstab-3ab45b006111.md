---
id: "component.frontend.frontend.src.components.operator.cartella.narrativesectionstab.narrativesectionstab"
kind: "typescript-react-component"
title: "NarrativeSectionsTab"
status: "observed"
summary: "Exported react-component from frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx"
    symbol: "NarrativeSectionsTab"
    line_start: "30"
    line_end: "133"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.cartella.narrativesectionstab.narrativesectionstab` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.cartella.narrativesectionstab.narrativesectionstab is the canonical typescript-react-component named NarrativeSectionsTab.

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

The symbol is exported across its module boundary as `NarrativeSectionsTab`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx:30-133` — NarrativeSectionsTab

## Related Knowledge

- `belongs-to` → `project.frontend`
