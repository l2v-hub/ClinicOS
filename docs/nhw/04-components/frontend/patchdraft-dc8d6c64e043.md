---
id: "component.frontend.frontend.src.components.shared.intake.intakedraftapi.patchdraft"
kind: "typescript-function"
title: "patchDraft"
status: "observed"
summary: "Exported function from frontend/src/components/shared/intake/intakeDraftApi.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/intake/intakeDraftApi.ts"
    symbol: "patchDraft"
    line_start: "64"
    line_end: "79"
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

What does `component.frontend.frontend.src.components.shared.intake.intakedraftapi.patchdraft` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.intake.intakedraftapi.patchdraft is the canonical typescript-function named patchDraft.

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
- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`
- `frontend/src/components/shared/intake/__tests__/intakeDraftApi.test.ts`

## Invariants

The symbol is exported across its module boundary as `patchDraft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/intake/intakeDraftApi.ts:64-79` — patchDraft

## Related Knowledge

- `belongs-to` → `project.frontend`
