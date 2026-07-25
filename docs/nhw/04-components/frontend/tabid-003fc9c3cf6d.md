---
id: "component.frontend.frontend.src.components.operator.patientdetail.tabid"
kind: "typescript-type-alias"
title: "TabId"
status: "observed"
summary: "Exported type-alias from frontend/src/components/operator/PatientDetail.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/PatientDetail.tsx"
    symbol: "TabId"
    line_start: "57"
    line_end: "75"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/PatientDetail.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.patientdetail.tabid` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.patientdetail.tabid is the canonical typescript-type-alias named TabId.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`

## Invariants

The symbol is exported across its module boundary as `TabId`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/PatientDetail.tsx:57-75` — TabId

## Related Knowledge

- `belongs-to` → `project.frontend`
