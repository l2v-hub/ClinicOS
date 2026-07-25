---
id: "component.backend.backend.src.ai.voice.write-services.prismavoicewriter"
kind: "typescript-constant"
title: "prismaVoiceWriter"
status: "observed"
summary: "Exported constant from backend/src/ai/voice/write-services.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/write-services.ts"
    symbol: "prismaVoiceWriter"
    line_start: "35"
    line_end: "131"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/write-services.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.write-services.prismavoicewriter` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.write-services.prismavoicewriter is the canonical typescript-constant named prismaVoiceWriter.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `prismaVoiceWriter`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/write-services.ts:35-131` — prismaVoiceWriter

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
