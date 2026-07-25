---
id: "component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-extraction.py.extractionoutput"
kind: "python-class"
title: "ExtractionOutput"
status: "observed"
summary: "Public Python class from clinicos-ai-runtime/clinicos_ai/agents/extraction.py."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/agents/extraction.py"
    symbol: "ExtractionOutput"
    line_start: "16"
    line_end: "19"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.clinicos-ai-runtime"
    evidence: "clinicos-ai-runtime/clinicos_ai/agents/extraction.py"
    confidence: "observed"
tags:
  - "python"
  - "class"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
---

## Question Answered

What does `component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-extraction.py.extractionoutput` represent in ClinicOS?

## Canonical Definition

component.ai-runtime.clinicos-ai-runtime-clinicos-ai-agents-extraction.py.extractionoutput is the canonical python-class named ExtractionOutput.

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

The public symbol name is `ExtractionOutput`.

## Failure Modes

None observed

## Evidence

- `clinicos-ai-runtime/clinicos_ai/agents/extraction.py:16-19` — ExtractionOutput

## Related Knowledge

- `belongs-to` → `project.clinicos-ai-runtime`
