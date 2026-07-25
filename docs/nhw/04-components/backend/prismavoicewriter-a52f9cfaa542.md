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
    target: "project.backend"
    evidence: "backend/src/ai/voice/write-services.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
