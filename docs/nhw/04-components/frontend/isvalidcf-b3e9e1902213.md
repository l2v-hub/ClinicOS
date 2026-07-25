---
id: 'component.frontend.frontend.src.lib.codicefiscale.isvalidcf'
kind: 'typescript-function'
title: 'isValidCF'
status: 'observed'
summary: 'Exported function from frontend/src/lib/codiceFiscale.ts.'
bounded_contexts:
  - 'context.delivery-quality-governance'
sources:
  - path: 'frontend/src/lib/codiceFiscale.ts'
    symbol: 'isValidCF'
    line_start: '11'
    line_end: '19'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.frontend'
    evidence: 'frontend/src/lib/codiceFiscale.ts'
    confidence: 'observed'
tags:
  - 'typescript'
  - 'function'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `component.frontend.frontend.src.lib.codicefiscale.isvalidcf` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.codicefiscale.isvalidcf is the canonical typescript-function named isValidCF.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/NewPatientModal.tsx`
- `frontend/src/components/shared/intake/IntakeWorkspace.tsx`
- `frontend/src/components/shared/intake/StepAnagrafica.tsx`

## Invariants

The symbol is exported across its module boundary as `isValidCF`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/codiceFiscale.ts:11-19` — isValidCF

## Related Knowledge

- `belongs-to` → `project.frontend`
