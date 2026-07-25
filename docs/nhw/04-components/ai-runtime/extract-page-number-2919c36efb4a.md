---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.extract-page-number"
kind: "python-function"
title: "extract_page_number"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py"
    symbol: "extract_page_number"
    line_start: "33"
    line_end: "57"
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
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.extract-page-number` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.extract-page-number is the canonical python-function named extract_page_number.

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

The public symbol name is `extract_page_number`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py:33-57` — extract_page_number

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
