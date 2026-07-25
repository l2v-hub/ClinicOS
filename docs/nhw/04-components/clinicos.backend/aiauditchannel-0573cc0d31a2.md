---
id: "component.backend.backend.src.ai.audit-store.aiauditchannel"
kind: "typescript-type-alias"
title: "AiAuditChannel"
status: "observed"
summary: "Exported type-alias from backend/src/ai/audit-store.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/audit-store.ts"
    symbol: "AiAuditChannel"
    line_start: "14"
    line_end: "14"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/audit-store.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.audit-store.aiauditchannel` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.audit-store.aiauditchannel is the canonical typescript-type-alias named AiAuditChannel.

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

The symbol is exported across its module boundary as `AiAuditChannel`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/audit-store.ts:14-14` — AiAuditChannel

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
