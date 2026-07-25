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
    target: "project.backend"
    evidence: "backend/src/ai/voice/audit.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
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

Owning project: `project.backend`.

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

- `belongs-to` → `project.backend`
