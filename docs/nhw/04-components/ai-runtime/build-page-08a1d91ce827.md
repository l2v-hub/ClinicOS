---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.build-page"
kind: "python-function"
title: "build_page"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py"
    symbol: "build_page"
    line_start: "93"
    line_end: "111"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py"
    confidence: "observed"
tags:
  - "python"
  - "function"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.build-page` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.build-page is the canonical python-function named build_page.

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

The public symbol name is `build_page`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py:93-111` — build_page

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
