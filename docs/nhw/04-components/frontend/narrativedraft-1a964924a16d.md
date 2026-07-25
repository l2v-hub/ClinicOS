---
id: "component.frontend.frontend.src.components.shared.sections.derivesections.narrativedraft"
kind: "typescript-interface"
title: "NarrativeDraft"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/sections/deriveSections.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/components/shared/sections/deriveSections.ts"
    symbol: "NarrativeDraft"
    line_start: "16"
    line_end: "50"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/deriveSections.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.derivesections.narrativedraft` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.derivesections.narrativedraft is the canonical typescript-interface named NarrativeDraft.

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
- `frontend/src/components/shared/sections/__tests__/import-contract.test.ts`

## Invariants

The symbol is exported across its module boundary as `NarrativeDraft`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/deriveSections.ts:16-50` — NarrativeDraft

## Related Knowledge

- `belongs-to` → `project.frontend`
