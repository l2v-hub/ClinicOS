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
    target: "project.backend"
    evidence: "backend/src/ai/audit-store.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
