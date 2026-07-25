---
id: "component.frontend.frontend.src.components.shared.sections.narrativeclinicalsection.boldtag"
kind: "typescript-interface"
title: "BoldTag"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/sections/NarrativeClinicalSection.tsx."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "frontend/src/components/shared/sections/NarrativeClinicalSection.tsx"
    symbol: "BoldTag"
    line_start: "10"
    line_end: "16"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/sections/NarrativeClinicalSection.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.sections.narrativeclinicalsection.boldtag` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.sections.narrativeclinicalsection.boldtag is the canonical typescript-interface named BoldTag.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/NarrativeSectionsTab.tsx`

## Invariants

The symbol is exported across its module boundary as `BoldTag`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/sections/NarrativeClinicalSection.tsx:10-16` — BoldTag

## Related Knowledge

- `belongs-to` → `project.frontend`
