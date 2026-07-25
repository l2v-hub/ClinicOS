---
id: "component.frontend.frontend.src.components.shared.clinicalcard.clinicalcardprops"
kind: "typescript-interface"
title: "ClinicalCardProps"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/ClinicalCard.tsx."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/components/shared/ClinicalCard.tsx"
    symbol: "ClinicalCardProps"
    line_start: "3"
    line_end: "12"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/ClinicalCard.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.clinicalcard.clinicalcardprops` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.clinicalcard.clinicalcardprops is the canonical typescript-interface named ClinicalCardProps.

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

The symbol is exported across its module boundary as `ClinicalCardProps`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/ClinicalCard.tsx:3-12` — ClinicalCardProps

## Related Knowledge

- `belongs-to` → `project.frontend`
