---
id: "component.frontend.frontend.src.components.shared.sections.derivesections.sectionsfromnarrative"
kind: "typescript-function"
title: "sectionsFromNarrative"
status: "observed"
summary: "Exported function from frontend/src/components/shared/sections/deriveSections.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/components/shared/sections/deriveSections.ts"
    symbol: "sectionsFromNarrative"
    line_start: "94"
    line_end: "149"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.derivesections.sectionsfromnarrative` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.derivesections.sectionsfromnarrative is the canonical typescript-function named sectionsFromNarrative.

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

The symbol is exported across its module boundary as `sectionsFromNarrative`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/deriveSections.ts:94-149` — sectionsFromNarrative

## Related Knowledge

- `belongs-to` → `project.frontend`
