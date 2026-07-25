---
id: "component.frontend.frontend.src.components.shared.intake.intakedraftapi.createdraftfromimport"
kind: "typescript-function"
title: "createDraftFromImport"
status: "observed"
summary: "Exported function from frontend/src/components/shared/intake/intakeDraftApi.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/intake/intakeDraftApi.ts"
    symbol: "createDraftFromImport"
    line_start: "93"
    line_end: "107"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/intake/intakeDraftApi.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.intake.intakedraftapi.createdraftfromimport` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.intakedraftapi.createdraftfromimport is the canonical typescript-function named createDraftFromImport.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/DischargeImportModal.tsx`

## Invariants

The symbol is exported across its module boundary as `createDraftFromImport`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/intakeDraftApi.ts:93-107` — createDraftFromImport

## Related Knowledge

- `belongs-to` → `project.frontend`
