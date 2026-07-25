---
id: "component.backend.backend.src.ai.upload.validation.filevalidationresult"
kind: "typescript-interface"
title: "FileValidationResult"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/validation.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/validation.ts"
    symbol: "FileValidationResult"
    line_start: "52"
    line_end: "57"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/validation.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.validation.filevalidationresult` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.validation.filevalidationresult is the canonical typescript-interface named FileValidationResult.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `FileValidationResult`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/validation.ts:52-57` — FileValidationResult

## Related Knowledge

- `belongs-to` → `project.backend`
