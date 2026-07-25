---
id: "component.backend.backend.src.ai.audit-store.aiauditeventinput"
kind: "typescript-interface"
title: "AiAuditEventInput"
status: "observed"
summary: "Exported interface from backend/src/ai/audit-store.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/audit-store.ts"
    symbol: "AiAuditEventInput"
    line_start: "17"
    line_end: "32"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/audit-store.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.audit-store.aiauditeventinput` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.audit-store.aiauditeventinput is the canonical typescript-interface named AiAuditEventInput.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/actions.test.ts`
- `backend/src/ai/__tests__/operational-audit.test.ts`
- `backend/src/ai/__tests__/voice-privacy-logging.test.ts`

## Invariants

The symbol is exported across its module boundary as `AiAuditEventInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/audit-store.ts:17-32` — AiAuditEventInput

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
