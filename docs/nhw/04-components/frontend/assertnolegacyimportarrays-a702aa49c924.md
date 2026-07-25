---
id: "component.frontend.frontend.src.components.shared.sections.derivesections.assertnolegacyimportarrays"
kind: "typescript-function"
title: "assertNoLegacyImportArrays"
status: "observed"
summary: "Exported function from frontend/src/components/shared/sections/deriveSections.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "frontend/src/components/shared/sections/deriveSections.ts"
    symbol: "assertNoLegacyImportArrays"
    line_start: "82"
    line_end: "92"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/deriveSections.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.derivesections.assertnolegacyimportarrays` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.derivesections.assertnolegacyimportarrays is the canonical typescript-function named assertNoLegacyImportArrays.

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
- `frontend/src/components/shared/sections/__tests__/import-contract.test.ts`

## Invariants

The symbol is exported across its module boundary as `assertNoLegacyImportArrays`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/deriveSections.ts:82-92` — assertNoLegacyImportArrays

## Related Knowledge

- `belongs-to` → `project.frontend`
