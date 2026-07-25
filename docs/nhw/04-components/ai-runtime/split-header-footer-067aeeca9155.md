---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.split-header-footer"
kind: "python-function"
title: "split_header_footer"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py"
    symbol: "split_header_footer"
    line_start: "60"
    line_end: "90"
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
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.split-header-footer` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.split-header-footer is the canonical python-function named split_header_footer.

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

The public symbol name is `split_header_footer`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py:60-90` — split_header_footer

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
