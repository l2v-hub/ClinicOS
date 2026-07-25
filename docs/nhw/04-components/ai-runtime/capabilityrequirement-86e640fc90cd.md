---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-capabilities.py.capabilityrequirement"
kind: "python-class"
title: "CapabilityRequirement"
status: "observed"
summary: "Public Python class from clinicos-ai-runtime/clinicos_ai/models/capabilities.py."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/models/capabilities.py"
    symbol: "CapabilityRequirement"
    line_start: "38"
    line_end: "62"
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
  inventory_hash: "c9afd3c8ec19230402b6b7a13d5dafa466340869ffb16b942b4d37abf28bdf7d"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-capabilities.py.capabilityrequirement` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-models-capabilities.py.capabilityrequirement is the canonical python-class named CapabilityRequirement.

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

The public symbol name is `CapabilityRequirement`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/models/capabilities.py:38-62` — CapabilityRequirement

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
