---
id: "component.backend.backend.src.ai.voice.audit.voiceaudit"
kind: "typescript-function"
title: "voiceAudit"
status: "observed"
summary: "Exported function from backend/src/ai/voice/audit.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/voice/audit.ts"
    symbol: "voiceAudit"
    line_start: "33"
    line_end: "68"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/audit.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.audit.voiceaudit` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.audit.voiceaudit is the canonical typescript-function named voiceAudit.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/actions/orchestrate.ts`
- `backend/src/ai/voice/execute.ts`

## Invariants

The symbol is exported across its module boundary as `voiceAudit`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/audit.ts:33-68` — voiceAudit

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
