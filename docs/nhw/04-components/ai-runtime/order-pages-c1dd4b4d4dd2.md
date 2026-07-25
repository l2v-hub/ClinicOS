---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.order-pages"
kind: "python-function"
title: "order_pages"
status: "observed"
summary: "Public Python function from clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py"
    symbol: "order_pages"
    line_start: "114"
    line_end: "136"
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
  inventory_hash: "2795bded959bb18b7093e7b78e09e009420c83bddf50a2eb3099c3d580a2fb30"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.order-pages` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-processing.py.order-pages is the canonical python-function named order_pages.

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

The public symbol name is `order_pages`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/document_profiles/processing.py:114-136` — order_pages

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
