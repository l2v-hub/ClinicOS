---
id: "component.backend.backend.src.ai.sections.markdown-parse.parsenarrativefrommarkdown"
kind: "typescript-function"
title: "parseNarrativeFromMarkdown"
status: "observed"
summary: "Exported function from backend/src/ai/sections/markdown-parse.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/sections/markdown-parse.ts"
    symbol: "parseNarrativeFromMarkdown"
    line_start: "184"
    line_end: "251"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/markdown-parse.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.markdown-parse.parsenarrativefrommarkdown` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.markdown-parse.parsenarrativefrommarkdown is the canonical typescript-function named parseNarrativeFromMarkdown.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/scripts/req037-evidence.ts`
- `backend/src/ai/__tests__/markdown-parse.test.ts`
- `e2e/issue-242-parse.ts`

## Invariants

The symbol is exported across its module boundary as `parseNarrativeFromMarkdown`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/markdown-parse.ts:184-251` — parseNarrativeFromMarkdown

## Related Knowledge

- `belongs-to` → `project.backend`
