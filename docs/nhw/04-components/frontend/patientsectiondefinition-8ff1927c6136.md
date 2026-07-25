---
id: "component.frontend.frontend.src.components.operator.sections.types.patientsectiondefinition"
kind: "typescript-interface"
title: "PatientSectionDefinition"
status: "observed"
summary: "Exported interface from frontend/src/components/operator/sections/types.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/components/operator/sections/types.ts"
    symbol: "PatientSectionDefinition"
    line_start: "15"
    line_end: "23"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/operator/sections/types.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.frontend.frontend.src.components.operator.sections.types.patientsectiondefinition` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.operator.sections.types.patientsectiondefinition is the canonical typescript-interface named PatientSectionDefinition.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/sections/patientSections.ts`

## Invariants

The symbol is exported across its module boundary as `PatientSectionDefinition`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/operator/sections/types.ts:15-23` — PatientSectionDefinition

## Related Knowledge

- `belongs-to` → `project.frontend`
