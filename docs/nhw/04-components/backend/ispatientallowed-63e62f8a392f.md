---
id: "component.backend.backend.src.ai.gateway.context.ispatientallowed"
kind: "typescript-function"
title: "isPatientAllowed"
status: "observed"
summary: "Exported function from backend/src/ai/gateway/context.ts."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "backend/src/ai/gateway/context.ts"
    symbol: "isPatientAllowed"
    line_start: "57"
    line_end: "60"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/context.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.context.ispatientallowed` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.context.ispatientallowed is the canonical typescript-function named isPatientAllowed.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/gateway.test.ts`

## Invariants

The symbol is exported across its module boundary as `isPatientAllowed`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/context.ts:57-60` — isPatientAllowed

## Related Knowledge

- `belongs-to` → `project.backend`
