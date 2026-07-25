---
id: "component.frontend.frontend.src.app.app"
kind: "typescript-react-component"
title: "App"
status: "observed"
summary: "Exported react-component from frontend/src/App.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/App.tsx"
    symbol: "App"
    line_start: "130"
    line_end: "1597"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/App.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.app.app` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.app.app is the canonical typescript-react-component named App.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/main.tsx`

## Invariants

The symbol is exported across its module boundary as `App`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/App.tsx:130-1597` — App

## Related Knowledge

- `belongs-to` → `project.frontend`
