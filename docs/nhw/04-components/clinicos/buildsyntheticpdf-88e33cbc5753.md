---
id: "component.e2e.e2e.real-pdf.buildsyntheticpdf"
kind: "typescript-function"
title: "buildSyntheticPdf"
status: "observed"
summary: "Exported function from e2e/real-pdf.mjs."
bounded_contexts:
  - "context.delivery-quality-governance"
sources:
  - path: "e2e/real-pdf.mjs"
    symbol: "buildSyntheticPdf"
    line_start: "3"
    line_end: "28"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos"
    evidence: "e2e/real-pdf.mjs"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.e2e.e2e.real-pdf.buildsyntheticpdf` represent in ClinicOS?

## Canonical Definition

component.e2e.e2e.real-pdf.buildsyntheticpdf is the canonical typescript-function named buildSyntheticPdf.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.clinicos`.

## Side Effects

None observed

## Consumers

- `e2e/prod-agent-check.mjs`
- `e2e/prod-conflict-check.mjs`
- `e2e/prod-dump.mjs`
- `e2e/prod-real-check.mjs`
- `e2e/prod-runtime-check.mjs`
- `e2e/req032-workspace-shots.mjs`
- `e2e/req033-narrative-flow-shots.mjs`
- `e2e/req035-narrative-content-shots.mjs`
- `e2e/req035v2-documents-shots.mjs`

## Invariants

The symbol is exported across its module boundary as `buildSyntheticPdf`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `e2e/real-pdf.mjs:3-28` — buildSyntheticPdf

## Related Knowledge

- `belongs-to` → `project.clinicos`
