---
id: "component.frontend.frontend.src.icons.icooperatori"
kind: "typescript-react-component"
title: "IcoOperatori"
status: "observed"
summary: "Exported react-component from frontend/src/icons.tsx."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/icons.tsx"
    symbol: "IcoOperatori"
    line_start: "392"
    line_end: "408"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/icons.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.frontend.frontend.src.icons.icooperatori` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.icons.icooperatori is the canonical typescript-react-component named IcoOperatori.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/admin/AdminDashboard.tsx`
- `frontend/src/components/shared/TeamsLikeSidebar.tsx`

## Invariants

The symbol is exported across its module boundary as `IcoOperatori`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/icons.tsx:392-408` — IcoOperatori

## Related Knowledge

- `belongs-to` → `project.frontend`
