---
id: "component.src.src.pages.patientspage.patientspage"
kind: "typescript-react-component"
title: "PatientsPage"
status: "observed"
summary: "Exported react-component from src/pages/PatientsPage.tsx."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "src/pages/PatientsPage.tsx"
    symbol: "PatientsPage"
    line_start: "1"
    line_end: "21"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "src/pages/PatientsPage.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.src.src.pages.patientspage.patientspage` represent in ClinicOS?

## Canonical Definition

component.src.src.pages.patientspage.patientspage is the canonical typescript-react-component named PatientsPage.

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

The symbol is exported across its module boundary as `PatientsPage`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `src/pages/PatientsPage.tsx:1-21` — PatientsPage

## Related Knowledge

- `belongs-to` → `project.clinicos`
