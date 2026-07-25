---
id: "component.backend.backend.src.ai.voice.vitals.parsedvitalvalue"
kind: "typescript-interface"
title: "ParsedVitalValue"
status: "observed"
summary: "Exported interface from backend/src/ai/voice/vitals.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/vitals.ts"
    symbol: "ParsedVitalValue"
    line_start: "44"
    line_end: "48"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/voice/vitals.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.vitals.parsedvitalvalue` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.vitals.parsedvitalvalue is the canonical typescript-interface named ParsedVitalValue.

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

The symbol is exported across its module boundary as `ParsedVitalValue`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/vitals.ts:44-48` — ParsedVitalValue

## Related Knowledge

- `belongs-to` → `project.backend`
