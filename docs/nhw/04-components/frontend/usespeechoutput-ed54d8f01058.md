---
id: "component.frontend.frontend.src.components.shared.agnos.usespeechoutput.usespeechoutput"
kind: "typescript-function"
title: "useSpeechOutput"
status: "observed"
summary: "Exported function from frontend/src/components/shared/agnos/useSpeechOutput.ts."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "frontend/src/components/shared/agnos/useSpeechOutput.ts"
    symbol: "useSpeechOutput"
    line_start: "20"
    line_end: "80"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.frontend"
    evidence: "frontend/src/components/shared/agnos/useSpeechOutput.ts"
    confidence: "observed"
tags:
  - "typescript"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "72e609c2ac06a4ade4df3d8719628805e2d1606ce4aec0e6f662451324869f8e"
---

## Question Answered

What does `component.frontend.frontend.src.components.shared.agnos.usespeechoutput.usespeechoutput` represent in ClinicOS?

## Canonical Definition

component.frontend.frontend.src.components.shared.agnos.usespeechoutput.usespeechoutput is the canonical typescript-function named useSpeechOutput.

## Inputs

Defined by the source signature at the cited span.

## Outputs

Defined by the exported return type.

## Dependencies

Owning project: `project.frontend`.

## Side Effects

None observed

## Consumers

- `frontend/src/components/shared/AgnosPanel.tsx`

## Invariants

The symbol is exported across its module boundary as `useSpeechOutput`.

## Failure Modes

Refer to callers and implementation at the cited source span.

## Evidence

- `frontend/src/components/shared/agnos/useSpeechOutput.ts:20-80` — useSpeechOutput

## Related Knowledge

- `belongs-to` → `project.frontend`
