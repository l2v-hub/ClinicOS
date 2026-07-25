---
id: "component.backend.backend.src.lib.therapy-dose.derivelegacyfromschedules"
kind: "typescript-function"
title: "deriveLegacyFromSchedules"
status: "observed"
summary: "Exported function from backend/src/lib/therapy-dose.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/lib/therapy-dose.ts"
    symbol: "deriveLegacyFromSchedules"
    line_start: "106"
    line_end: "136"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/lib/therapy-dose.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.lib.therapy-dose.derivelegacyfromschedules` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.therapy-dose.derivelegacyfromschedules is the canonical typescript-function named deriveLegacyFromSchedules.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/therapy-dose.test.ts`
- `backend/src/routes/patient-therapies.ts`
- `backend/src/therapies/therapy-create.ts`

## Invariants

The symbol is exported across its module boundary as `deriveLegacyFromSchedules`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/therapy-dose.ts:106-136` — deriveLegacyFromSchedules

## Related Knowledge

- `belongs-to` → `project.backend`
