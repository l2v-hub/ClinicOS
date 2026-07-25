---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-capabilities.py.modelcapabilities"
kind: "python-class"
title: "ModelCapabilities"
status: "observed"
summary: "Public Python class from clinicos-ai-runtime/clinicos_ai/models/capabilities.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/capabilities.py"
    symbol: "ModelCapabilities"
    line_start: "20"
    line_end: "34"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/models/capabilities.py"
    confidence: "observed"
tags:
  - "python"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-capabilities.py.modelcapabilities` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-capabilities.py.modelcapabilities is the canonical python-class named ModelCapabilities.

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

The public symbol name is `ModelCapabilities`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/capabilities.py:20-34` — ModelCapabilities

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
