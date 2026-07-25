---
id: "component.backend.backend.src.ai.sections.validate.isconfirmblocked"
kind: "typescript-function"
title: "isConfirmBlocked"
status: "observed"
summary: "Exported function from backend/src/ai/sections/validate.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/validate.ts"
    symbol: "isConfirmBlocked"
    line_start: "222"
    line_end: "224"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.validate.isconfirmblocked` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.validate.isconfirmblocked is the canonical typescript-function named isConfirmBlocked.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `isConfirmBlocked`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/validate.ts:222-224` — isConfirmBlocked

## Related Knowledge

- `belongs-to` → `project.backend`
