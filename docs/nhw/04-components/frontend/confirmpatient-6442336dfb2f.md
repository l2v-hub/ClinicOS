---
id: "component.frontend.frontend.src.components.shared.importreviewfull.confirmpatient"
kind: "typescript-interface"
title: "ConfirmPatient"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/ImportReviewFull.tsx."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "frontend/src/components/shared/ImportReviewFull.tsx"
    symbol: "ConfirmPatient"
    line_start: "20"
    line_end: "31"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/ImportReviewFull.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.importreviewfull.confirmpatient` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.importreviewfull.confirmpatient is the canonical typescript-interface named ConfirmPatient.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/DischargeImportModal.tsx`
- `frontend/src/components/shared/sections/ImportSectionsReview.tsx`

## Invariants

The symbol is exported across its module boundary as `ConfirmPatient`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/ImportReviewFull.tsx:20-31` — ConfirmPatient

## Related Knowledge

- `belongs-to` → `project.frontend`
