---
id: "flow.ai-extraction-job-lifecycle"
kind: "runtime-flow"
title: "AI extraction job lifecycle"
status: "inferred"
summary: "AI extraction job lifecycle workflow across ClinicOS components."
bounded_contexts:
  - "context.intake-document-processing"
sources:
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "llm_health"
    line_start: "108"
    line_end: "109"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "get_events"
    line_start: "179"
    line_end: "184"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "get_result"
    line_start: "188"
    line_end: "194"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "get_job"
    line_start: "170"
    line_end: "175"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "capabilities"
    line_start: "100"
    line_end: "101"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "health"
    line_start: "94"
    line_end: "96"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "assistant_compose"
    line_start: "133"
    line_end: "143"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "assistant_plan"
    line_start: "115"
    line_end: "126"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.get.v1-assistant-llm-health.3"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.get.v1-document-jobs-job-id-events.9"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.get.v1-document-jobs-job-id-result.10"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.get.v1-document-jobs-job-id.8"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.get.v1-runtime-capabilities.2"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.get.v1-runtime-health.1"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.post.v1-assistant-compose.5"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.post.v1-assistant-plan.4"
    evidence: "clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "83351c7297d615e6dd0b01b2a080abab4caebe90df6ec1748fcae0c72092b683"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.ai-extraction-job-lifecycle` represent in ClinicOS?

## Canonical Definition

flow.ai-extraction-job-lifecycle is the canonical runtime-flow named AI extraction job lifecycle.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.ai-runtime.get.v1-assistant-llm-health.3`
- `api.ai-runtime.get.v1-document-jobs-job-id-events.9`
- `api.ai-runtime.get.v1-document-jobs-job-id-result.10`
- `api.ai-runtime.get.v1-document-jobs-job-id.8`
- `api.ai-runtime.get.v1-runtime-capabilities.2`
- `api.ai-runtime.get.v1-runtime-health.1`
- `api.ai-runtime.post.v1-assistant-compose.5`
- `api.ai-runtime.post.v1-assistant-plan.4`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `clinicos-ai-runtime/clinicos_ai/api/app.py:108-109` — llm_health
- `clinicos-ai-runtime/clinicos_ai/api/app.py:179-184` — get_events
- `clinicos-ai-runtime/clinicos_ai/api/app.py:188-194` — get_result
- `clinicos-ai-runtime/clinicos_ai/api/app.py:170-175` — get_job
- `clinicos-ai-runtime/clinicos_ai/api/app.py:100-101` — capabilities
- `clinicos-ai-runtime/clinicos_ai/api/app.py:94-96` — health
- `clinicos-ai-runtime/clinicos_ai/api/app.py:133-143` — assistant_compose
- `clinicos-ai-runtime/clinicos_ai/api/app.py:115-126` — assistant_plan

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.ai-runtime.get.v1-assistant-llm-health.3`
- `invokes` → `api.ai-runtime.get.v1-document-jobs-job-id-events.9`
- `invokes` → `api.ai-runtime.get.v1-document-jobs-job-id-result.10`
- `invokes` → `api.ai-runtime.get.v1-document-jobs-job-id.8`
- `invokes` → `api.ai-runtime.get.v1-runtime-capabilities.2`
- `invokes` → `api.ai-runtime.get.v1-runtime-health.1`
- `invokes` → `api.ai-runtime.post.v1-assistant-compose.5`
- `invokes` → `api.ai-runtime.post.v1-assistant-plan.4`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `api.ai-runtime.get.v1-assistant-llm-health.3` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `api.ai-runtime.get.v1-document-jobs-job-id-events.9` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `api.ai-runtime.get.v1-document-jobs-job-id-result.10` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `api.ai-runtime.get.v1-document-jobs-job-id.8` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `api.ai-runtime.get.v1-runtime-capabilities.2` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `api.ai-runtime.get.v1-runtime-health.1` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `api.ai-runtime.post.v1-assistant-compose.5` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `api.ai-runtime.post.v1-assistant-plan.4` | Defined by cited component | Owning component error contract |
