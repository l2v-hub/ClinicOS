---
id: "component.backend.backend.src.ai.voice.vitals.vital-specs"
kind: "typescript-constant"
title: "VITAL_SPECS"
status: "observed"
summary: "Exported constant from backend/src/ai/voice/vitals.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/voice/vitals.ts"
    symbol: "VITAL_SPECS"
    line_start: "15"
    line_end: "23"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/voice/vitals.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.voice.vitals.vital-specs` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.voice.vitals.vital-specs is the canonical typescript-constant named VITAL_SPECS.

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

The symbol is exported across its module boundary as `VITAL_SPECS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/voice/vitals.ts:15-23` — VITAL_SPECS

## Related Knowledge

- `belongs-to` → `project.backend`
