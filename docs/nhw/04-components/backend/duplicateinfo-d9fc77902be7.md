---
id: "component.backend.backend.src.ai.upload.confirm-service.duplicateinfo"
kind: "typescript-interface"
title: "DuplicateInfo"
status: "observed"
summary: "Exported interface from backend/src/ai/upload/confirm-service.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/confirm-service.ts"
    symbol: "DuplicateInfo"
    line_start: "68"
    line_end: "73"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/confirm-service.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.confirm-service.duplicateinfo` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.confirm-service.duplicateinfo is the canonical typescript-interface named DuplicateInfo.

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

The symbol is exported across its module boundary as `DuplicateInfo`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/confirm-service.ts:68-73` — DuplicateInfo

## Related Knowledge

- `belongs-to` → `project.backend`
