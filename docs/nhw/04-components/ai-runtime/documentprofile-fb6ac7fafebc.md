---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-models.py.documentprofile"
kind: "python-class"
title: "DocumentProfile"
status: "observed"
summary: "Public Python class from clinicos-ai-runtime/clinicos_ai/document_profiles/models.py."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/document_profiles/models.py"
    symbol: "DocumentProfile"
    line_start: "13"
    line_end: "50"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/document_profiles/models.py"
    confidence: "observed"
tags:
  - "python"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-models.py.documentprofile` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-models.py.documentprofile is the canonical python-class named DocumentProfile.

## Inputs

Defined by the Python signature at the cited source span.

## Outputs

Defined by return annotations and implementation.

## Dependencies

Owning project: `project.clinicos-ai-runtime`.

## Side Effects

None observed

## Consumers

Import consumers are resolved through the source graph.

## Invariants

The public symbol name is `DocumentProfile`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/document_profiles/models.py:13-50` — DocumentProfile

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
