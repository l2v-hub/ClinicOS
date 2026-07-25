---
id: "component.frontend.frontend.src.components.shared.teamslikesidebar.teamslikesidebar"
kind: "typescript-react-component"
title: "TeamsLikeSidebar"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/TeamsLikeSidebar.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/TeamsLikeSidebar.tsx"
    symbol: "TeamsLikeSidebar"
    line_start: "55"
    line_end: "101"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/TeamsLikeSidebar.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.teamslikesidebar.teamslikesidebar` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.teamslikesidebar.teamslikesidebar is the canonical typescript-react-component named TeamsLikeSidebar.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/App.tsx`

## Invariants

The symbol is exported across its module boundary as `TeamsLikeSidebar`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/TeamsLikeSidebar.tsx:55-101` — TeamsLikeSidebar

## Related Knowledge

- `belongs-to` → `project.frontend`
