---
id: "component.backend.backend.src.lib.therapy-dose.scheduleinput"
kind: "typescript-interface"
title: "ScheduleInput"
status: "observed"
summary: "Exported interface from backend/src/lib/therapy-dose.ts."
bounded_contexts:
  - "context.therapy-administration"
sources:
  - path: "backend/src/lib/therapy-dose.ts"
    symbol: "ScheduleInput"
    line_start: "5"
    line_end: "11"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/lib/therapy-dose.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.backend.backend.src.lib.therapy-dose.scheduleinput` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.lib.therapy-dose.scheduleinput is the canonical typescript-interface named ScheduleInput.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/routes/patient-therapies.ts`
- `backend/src/routes/therapy.ts`
- `backend/src/therapies/therapy-create.ts`

## Invariants

The symbol is exported across its module boundary as `ScheduleInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/lib/therapy-dose.ts:5-11` — ScheduleInput

## Related Knowledge

- `belongs-to` → `project.backend`
