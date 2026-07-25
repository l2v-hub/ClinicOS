---
id: "component.frontend.frontend.src.components.shared.documentsourcepanel.patientdocmeta"
kind: "typescript-interface"
title: "PatientDocMeta"
status: "observed"
summary: "Exported interface from frontend/src/components/shared/DocumentSourcePanel.tsx."
bounded_contexts:
  - "context.patient-registry"
sources:
  - path: "frontend/src/components/shared/DocumentSourcePanel.tsx"
    symbol: "PatientDocMeta"
    line_start: "12"
    line_end: "20"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/DocumentSourcePanel.tsx"
    confidence: "observed"
tags:
  - "typescript"
  - "interface"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.documentsourcepanel.patientdocmeta` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.documentsourcepanel.patientdocmeta is the canonical typescript-interface named PatientDocMeta.

## Inputs

None observed

## Outputs

None observed

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/ImportedDocumentsList.tsx`

## Invariants

The symbol is exported across its module boundary as `PatientDocMeta`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/DocumentSourcePanel.tsx:12-20` — PatientDocMeta

## Related Knowledge

- `belongs-to` → `project.frontend`
