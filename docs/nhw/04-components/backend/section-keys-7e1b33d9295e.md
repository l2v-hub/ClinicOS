---
id: "component.backend.backend.src.ai.sections.profile.section-keys"
kind: "typescript-constant"
title: "SECTION_KEYS"
status: "observed"
summary: "Exported constant from backend/src/ai/sections/profile.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/profile.ts"
    symbol: "SECTION_KEYS"
    line_start: "16"
    line_end: "29"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/profile.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "constant"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.profile.section-keys` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.profile.section-keys is the canonical typescript-constant named SECTION_KEYS.

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

The symbol is exported across its module boundary as `SECTION_KEYS`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/profile.ts:16-29` — SECTION_KEYS

## Related Knowledge

- `belongs-to` → `project.backend`
