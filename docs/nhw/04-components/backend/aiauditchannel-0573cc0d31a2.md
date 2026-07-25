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
    target: "project.backend"
    evidence: "backend/src/ai/audit-store.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "type-alias"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
