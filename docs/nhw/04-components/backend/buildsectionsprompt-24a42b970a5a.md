---
id: "component.backend.backend.src.ai.sections.prompt.buildsectionsprompt"
kind: "typescript-function"
title: "buildSectionsPrompt"
status: "observed"
summary: "Exported function from backend/src/ai/sections/prompt.ts."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "backend/src/ai/sections/prompt.ts"
    symbol: "buildSectionsPrompt"
    line_start: "16"
    line_end: "64"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/sections/prompt.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.sections.prompt.buildsectionsprompt` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.sections.prompt.buildsectionsprompt is the canonical typescript-function named buildSectionsPrompt.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/sections/index.ts`

## Invariants

The symbol is exported across its module boundary as `buildSectionsPrompt`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/sections/prompt.ts:16-64` — buildSectionsPrompt

## Related Knowledge

- `belongs-to` → `project.backend`
