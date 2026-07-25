---
id: "component.backend.backend.src.ai.extraction-validate.normalizedate"
kind: "typescript-function"
title: "normalizeDate"
status: "observed"
summary: "Exported function from backend/src/ai/extraction-validate.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/extraction-validate.ts"
    symbol: "normalizeDate"
    line_start: "44"
    line_end: "58"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/extraction-validate.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.extraction-validate.normalizedate` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.extraction-validate.normalizedate is the canonical typescript-function named normalizeDate.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/extraction.test.ts`
- `backend/src/ai/upload/confirm-service.ts`

## Invariants

The symbol is exported across its module boundary as `normalizeDate`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/extraction-validate.ts:44-58` — normalizeDate

## Related Knowledge

- `belongs-to` → `project.backend`
