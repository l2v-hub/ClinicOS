---
id: "component.backend.backend.src.ai.gateway.types.clinicalsectionsearchinput"
kind: "typescript-interface"
title: "ClinicalSectionSearchInput"
status: "observed"
summary: "Exported interface from backend/src/ai/gateway/types.ts."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "backend/src/ai/gateway/types.ts"
    symbol: "ClinicalSectionSearchInput"
    line_start: "66"
    line_end: "71"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/ai/gateway/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.backend.backend.src.ai.gateway.types.clinicalsectionsearchinput` represent in ClinicOS?

## Canonical Definition

component.backend.backend.src.ai.gateway.types.clinicalsectionsearchinput is the canonical typescript-interface named ClinicalSectionSearchInput.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.backend`.

## Side Effects

None observed

## Consumers

- `backend/src/ai/gateway/services.ts`

## Invariants

The symbol is exported across its module boundary as `ClinicalSectionSearchInput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `backend/src/ai/gateway/types.ts:66-71` — ClinicalSectionSearchInput

## Related Knowledge

- `belongs-to` → `project.backend`
