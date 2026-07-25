---
id: "component.backend.backend.src.ai.config.loadaiconfig"
kind: "typescript-function"
title: "loadAiConfig"
status: "observed"
summary: "Exported function from backend/src/ai/config.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/config.ts"
    symbol: "loadAiConfig"
    line_start: "66"
    line_end: "132"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/config.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.backend.backend.src.ai.config.loadaiconfig` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.config.loadaiconfig is the canonical typescript-function named loadAiConfig.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/config.test.ts`
- `backend/src/ai/__tests__/extraction.test.ts`
- `backend/src/ai/provider-factory.ts`
- `backend/src/ai/upload/job-service.ts`
- `backend/src/ai/upload/storage.ts`
- `backend/src/ai/upload/worker.ts`
- `backend/src/routes/ai-extraction.ts`
- `backend/src/routes/ai-jobs.ts`

## Invariants

The symbol is exported across its module boundary as `loadAiConfig`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/config.ts:66-132` — loadAiConfig

## Related Knowledge

- `belongs-to` → `project.backend`
