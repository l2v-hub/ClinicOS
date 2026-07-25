---
id: "component.backend.backend.src.ai.upload.mime-sniff.sniffmime"
kind: "typescript-function"
title: "sniffMime"
status: "observed"
summary: "Exported function from backend/src/ai/upload/mime-sniff.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/upload/mime-sniff.ts"
    symbol: "sniffMime"
    line_start: "32"
    line_end: "57"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/upload/mime-sniff.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.upload.mime-sniff.sniffmime` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.upload.mime-sniff.sniffmime is the canonical typescript-function named sniffMime.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/upload.test.ts`
- `backend/src/ai/upload/validation.ts`

## Invariants

The symbol is exported across its module boundary as `sniffMime`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/upload/mime-sniff.ts:32-57` — sniffMime

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
