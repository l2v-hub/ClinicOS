---
id: "component.backend.backend.src.ai.sections.narrative.narrative-schema-version"
kind: "typescript-constant"
title: "NARRATIVE_SCHEMA_VERSION"
status: "observed"
summary: "Exported constant from backend/src/ai/sections/narrative.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/narrative.ts"
    symbol: "NARRATIVE_SCHEMA_VERSION"
    line_start: "16"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/narrative.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.narrative.narrative-schema-version` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.narrative.narrative-schema-version is the canonical typescript-constant named NARRATIVE_SCHEMA_VERSION.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/__tests__/narrative.test.ts`
- `backend/src/ai/sections/markdown-parse.ts`

## Invariants

The symbol is exported across its module boundary as `NARRATIVE_SCHEMA_VERSION`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/narrative.ts:16-16` — NARRATIVE_SCHEMA_VERSION

## Related Knowledge

- `belongs-to` → `project.backend`
