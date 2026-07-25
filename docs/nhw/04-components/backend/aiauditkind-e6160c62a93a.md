---
id: "component.backend.backend.src.ai.audit-store.aiauditkind"
kind: "typescript-type-alias"
title: "AiAuditKind"
status: "observed"
summary: "Exported type-alias from backend/src/ai/audit-store.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/audit-store.ts"
    symbol: "AiAuditKind"
    line_start: "11"
    line_end: "11"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.audit-store.aiauditkind` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.audit-store.aiauditkind is the canonical typescript-type-alias named AiAuditKind.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/voice/audit.ts`

## Invariants

The symbol is exported across its module boundary as `AiAuditKind`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/audit-store.ts:11-11` — AiAuditKind

## Related Knowledge

- `belongs-to` → `project.backend`
