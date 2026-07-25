---
id: "component.backend.backend.src.ai.sections.markdown-parse.parsedsection"
kind: "typescript-interface"
title: "ParsedSection"
status: "observed"
summary: "Exported interface from backend/src/ai/sections/markdown-parse.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/markdown-parse.ts"
    symbol: "ParsedSection"
    line_start: "140"
    line_end: "144"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/markdown-parse.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.markdown-parse.parsedsection` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.markdown-parse.parsedsection is the canonical typescript-interface named ParsedSection.

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

The symbol is exported across its module boundary as `ParsedSection`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/markdown-parse.ts:140-144` — ParsedSection

## Related Knowledge

- `belongs-to` → `project.backend`
