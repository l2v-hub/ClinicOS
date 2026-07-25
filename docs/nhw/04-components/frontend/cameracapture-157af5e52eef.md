---
id: "component.frontend.frontend.src.components.shared.cameracapture.cameracapture"
kind: "typescript-react-component"
title: "CameraCapture"
status: "observed"
summary: "Exported react-component from frontend/src/components/shared/CameraCapture.tsx."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "frontend/src/components/shared/CameraCapture.tsx"
    symbol: "CameraCapture"
    line_start: "25"
    line_end: "252"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/CameraCapture.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "react-component"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.cameracapture.cameracapture` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.cameracapture.cameracapture is the canonical typescript-react-component named CameraCapture.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/DischargeImportModal.tsx`

## Invariants

The symbol is exported across its module boundary as `CameraCapture`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/CameraCapture.tsx:25-252` — CameraCapture

## Related Knowledge

- `belongs-to` → `project.frontend`
