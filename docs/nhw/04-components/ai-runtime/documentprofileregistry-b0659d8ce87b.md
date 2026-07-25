---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-registry.py.documentprofileregistry"
kind: "python-class"
title: "DocumentProfileRegistry"
status: "observed"
summary: "Public Python class from clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py."
bounded_contexts:
  - "context.clinical-record"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py"
    symbol: "DocumentProfileRegistry"
    line_start: "16"
    line_end: "56"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py"
    confidence: "observed"
tags:
  - "python"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "1a33da4292b14f795c966b6b4be3fa1ccc6b48f91cb59e051d8bc5fd29fb86e5"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-registry.py.documentprofileregistry` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-document-profiles-registry.py.documentprofileregistry is the canonical python-class named DocumentProfileRegistry.

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

The public symbol name is `DocumentProfileRegistry`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/document_profiles/registry.py:16-56` — DocumentProfileRegistry

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
