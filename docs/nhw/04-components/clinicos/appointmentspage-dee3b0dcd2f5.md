---
id: "component.src.src.pages.appointmentspage.appointmentspage"
kind: "typescript-react-component"
title: "AppointmentsPage"
status: "observed"
summary: "Exported react-component from src/pages/AppointmentsPage.tsx."
bounded_contexts:
  - "context.scheduling"
sources:
  - path: "src/pages/AppointmentsPage.tsx"
    symbol: "AppointmentsPage"
    line_start: "1"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "src/pages/AppointmentsPage.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.src.src.pages.appointmentspage.appointmentspage` represent in ClinicOS?

## Canonical Definition

component.src.src.pages.appointmentspage.appointmentspage is the canonical typescript-react-component named AppointmentsPage.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.clinicos`.

## Side Effects

None observed

## Consumers

None observed

## Invariants

The symbol is exported across its module boundary as `AppointmentsPage`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `src/pages/AppointmentsPage.tsx:1-21` — AppointmentsPage

## Related Knowledge

- `belongs-to` → `project.clinicos`
