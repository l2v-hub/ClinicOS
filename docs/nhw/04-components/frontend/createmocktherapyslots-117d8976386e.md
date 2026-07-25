---
id: "component.frontend.frontend.src.mockdata.createmocktherapyslots"
kind: "typescript-function"
title: "createMockTherapySlots"
status: "observed"
summary: "Exported function from frontend/src/mockData.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "frontend/src/mockData.ts"
    symbol: "createMockTherapySlots"
    line_start: "833"
    line_end: "1047"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/mockData.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.mockdata.createmocktherapyslots` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.mockdata.createmocktherapyslots is the canonical typescript-function named createMockTherapySlots.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`

## Invariants

The symbol is exported across its module boundary as `createMockTherapySlots`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/mockData.ts:833-1047` — createMockTherapySlots

## Related Knowledge

- `belongs-to` → `project.frontend`
