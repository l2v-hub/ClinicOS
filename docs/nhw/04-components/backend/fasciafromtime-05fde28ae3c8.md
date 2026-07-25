---
id: "component.backend.backend.src.lib.therapy-dose.fasciafromtime"
kind: "typescript-function"
title: "fasciaFromTime"
status: "observed"
summary: "Exported function from backend/src/lib/therapy-dose.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/lib/therapy-dose.ts"
    symbol: "fasciaFromTime"
    line_start: "22"
    line_end: "28"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/lib/therapy-dose.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.lib.therapy-dose.fasciafromtime` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.therapy-dose.fasciafromtime is the canonical typescript-function named fasciaFromTime.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/__tests__/therapy-dose.test.ts`

## Invariants

The symbol is exported across its module boundary as `fasciaFromTime`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/therapy-dose.ts:22-28` — fasciaFromTime

## Related Knowledge

- `belongs-to` → `project.backend`
