---
id: "component.frontend.frontend.src.lib.entraauth.documentauthheaders"
kind: "typescript-function"
title: "documentAuthHeaders"
status: "observed"
summary: "Exported function from frontend/src/lib/entraAuth.ts."
bounded_contexts:
  - "context.identity-access"
sources:
  - path: "frontend/src/lib/entraAuth.ts"
    symbol: "documentAuthHeaders"
    line_start: "68"
    line_end: "80"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/lib/entraAuth.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.frontend.frontend.src.lib.entraauth.documentauthheaders` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.lib.entraauth.documentauthheaders is the canonical typescript-function named documentAuthHeaders.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/operator/cartella/EsamiConsulenzeTab.tsx`
- `frontend/src/components/operator/cartella/ImportedDocumentsList.tsx`

## Invariants

The symbol is exported across its module boundary as `documentAuthHeaders`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/lib/entraAuth.ts:68-80` — documentAuthHeaders

## Related Knowledge

- `belongs-to` → `project.frontend`
