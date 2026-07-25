---
id: "component.backend.backend.src.ai.upload.mime-sniff.sniffedtype"
kind: "typescript-type-alias"
title: "SniffedType"
status: "observed"
summary: "Exported type-alias from backend/src/ai/upload/mime-sniff.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/mime-sniff.ts"
    symbol: "SniffedType"
    line_start: "7"
    line_end: "17"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/upload/mime-sniff.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.mime-sniff.sniffedtype` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.mime-sniff.sniffedtype is the canonical typescript-type-alias named SniffedType.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/upload/validation.ts`

## Invariants

The symbol is exported across its module boundary as `SniffedType`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/mime-sniff.ts:7-17` — SniffedType

## Related Knowledge

- `belongs-to` → `project.backend`
