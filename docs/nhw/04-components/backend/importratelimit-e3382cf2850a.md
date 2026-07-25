---
id: "component.backend.backend.src.ai.rate-limit.importratelimit"
kind: "typescript-constant"
title: "importRateLimit"
status: "observed"
summary: "Exported constant from backend/src/ai/rate-limit.ts."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "backend/src/ai/rate-limit.ts"
    symbol: "importRateLimit"
    line_start: "41"
    line_end: "41"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/rate-limit.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.rate-limit.importratelimit` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.rate-limit.importratelimit is the canonical typescript-constant named importRateLimit.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/security.test.ts`
- `backend/src/routes/ai-actions.ts`
- `backend/src/routes/ai-assistant-public.ts`
- `backend/src/routes/ai-jobs.ts`
- `backend/src/routes/ai-voice.ts`

## Invariants

The symbol is exported across its module boundary as `importRateLimit`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/rate-limit.ts:41-41` — importRateLimit

## Related Knowledge

- `belongs-to` → `project.backend`
