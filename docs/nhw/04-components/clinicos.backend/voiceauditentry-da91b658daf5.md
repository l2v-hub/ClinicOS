---
id: "component.backend.backend.src.ai.voice.audit.voiceauditentry"
kind: "typescript-interface"
title: "VoiceAuditEntry"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/audit.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/ai/voice/audit.ts"
    symbol: "VoiceAuditEntry"
    line_start: "11"
    line_end: "23"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos.backend"
    evidence: "backend/src/ai/voice/audit.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.audit.voiceauditentry` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.audit.voiceauditentry is the canonical typescript-interface named VoiceAuditEntry.

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

The symbol is exported across its module boundary as `VoiceAuditEntry`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/audit.ts:11-23` — VoiceAuditEntry

## Related Knowledge

- `belongs-to` → `project.clinicos.backend`
