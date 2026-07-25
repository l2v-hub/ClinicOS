---
id: "flow.assistant-read-composition"
kind: "runtime-flow"
title: "Assistant read planning and composition"
status: "inferred"
summary: "Assistant read planning and composition workflow across ClinicOS components."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/ai-assistant-public.ts"
    line_start: "55"
    line_end: "68"
    confidence: "observed"
  - path: "backend/src/routes/internal-ai.ts"
    line_start: "122"
    line_end: "129"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "llm_health"
    line_start: "109"
    line_end: "110"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "assistant_compose"
    line_start: "134"
    line_end: "144"
    confidence: "observed"
  - path: "clinicos-ai-runtime/clinicos_ai/api/app.py"
    symbol: "assistant_plan"
    line_start: "116"
    line_end: "127"
    confidence: "observed"
  - path: "backend/src/ai/assistant/agents.ts"
    symbol: "AGENT_PROFILES"
    line_start: "48"
    line_end: "63"
    confidence: "observed"
  - path: "backend/src/ai/assistant/agents.ts"
    symbol: "agentAllowsIntent"
    line_start: "77"
    line_end: "79"
    confidence: "observed"
  - path: "backend/src/ai/assistant/agents.ts"
    symbol: "AgentId"
    line_start: "8"
    line_end: "8"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "system.clinicos"
    evidence: "backend/src/routes/ai-assistant-public.ts,backend/src/routes/internal-ai.ts,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.get.v1-assistant-llm-health.3"
    evidence: "backend/src/routes/ai-assistant-public.ts,backend/src/routes/internal-ai.ts,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.post.v1-assistant-compose.5"
    evidence: "backend/src/routes/ai-assistant-public.ts,backend/src/routes/internal-ai.ts,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.ai-runtime.post.v1-assistant-plan.4"
    evidence: "backend/src/routes/ai-assistant-public.ts,backend/src/routes/internal-ai.ts,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-ai-assistant-query-20"
    evidence: "backend/src/routes/ai-assistant-public.ts,backend/src/routes/internal-ai.ts,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "api.backend.post-internal-ai-assistant-query-70"
    evidence: "backend/src/routes/ai-assistant-public.ts,backend/src/routes/internal-ai.ts,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.assistant.agents.agent-profiles"
    evidence: "backend/src/routes/ai-assistant-public.ts,backend/src/routes/internal-ai.ts,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.assistant.agents.agentallowsintent"
    evidence: "backend/src/routes/ai-assistant-public.ts,backend/src/routes/internal-ai.ts,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts"
    confidence: "inferred"
  - type: "invokes"
    target: "component.backend.backend.src.ai.assistant.agents.agentid"
    evidence: "backend/src/routes/ai-assistant-public.ts,backend/src/routes/internal-ai.ts,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,clinicos-ai-runtime/clinicos_ai/api/app.py,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts,backend/src/ai/assistant/agents.ts"
    confidence: "inferred"
tags:
  - "runtime-flow"
last_verified:
  commit: "working-tree"
  inventory_hash: "08c87c6a548cec58f1d08efe113cc064ee7c64dfcb11038dbd88590d39464548"
inference_rule: "Ordered workflow reconstructed from matching endpoint, component, persistence, test, and deployment evidence."
---

## Question Answered

What does `flow.assistant-read-composition` represent in ClinicOS?

## Canonical Definition

flow.assistant-read-composition is the canonical runtime-flow named Assistant read planning and composition.

## Inputs

Trigger-specific request, actor identity, and validated workflow payload.

## Outputs

Workflow-specific response or persisted state transition.

## Dependencies

- `system.clinicos`
- `api.backend.post-ai-assistant-query-20`
- `api.backend.post-internal-ai-assistant-query-70`
- `api.ai-runtime.get.v1-assistant-llm-health.3`
- `api.ai-runtime.post.v1-assistant-compose.5`
- `api.ai-runtime.post.v1-assistant-plan.4`
- `component.backend.backend.src.ai.assistant.agents.agent-profiles`
- `component.backend.backend.src.ai.assistant.agents.agentallowsintent`
- `component.backend.backend.src.ai.assistant.agents.agentid`

## Side Effects

See invoked endpoint and component units for exact writes and external calls.

## Consumers

Clinical users, frontend actions, automation, or deployment systems initiating the trigger.

## Invariants

Each transition must preserve validation, authorization, persistence, and evidence contracts of its invoked components.

## Failure Modes

Validation, authorization, persistence, external provider, or orchestration failures branch at the owning component.

## Evidence

- `backend/src/routes/ai-assistant-public.ts:55-68`
- `backend/src/routes/internal-ai.ts:122-129`
- `clinicos-ai-runtime/clinicos_ai/api/app.py:109-110` — llm_health
- `clinicos-ai-runtime/clinicos_ai/api/app.py:134-144` — assistant_compose
- `clinicos-ai-runtime/clinicos_ai/api/app.py:116-127` — assistant_plan
- `backend/src/ai/assistant/agents.ts:48-63` — AGENT_PROFILES
- `backend/src/ai/assistant/agents.ts:77-79` — agentAllowsIntent
- `backend/src/ai/assistant/agents.ts:8-8` — AgentId

## Related Knowledge

- `belongs-to` → `system.clinicos`
- `invokes` → `api.ai-runtime.get.v1-assistant-llm-health.3`
- `invokes` → `api.ai-runtime.post.v1-assistant-compose.5`
- `invokes` → `api.ai-runtime.post.v1-assistant-plan.4`
- `invokes` → `api.backend.post-ai-assistant-query-20`
- `invokes` → `api.backend.post-internal-ai-assistant-query-70`
- `invokes` → `component.backend.backend.src.ai.assistant.agents.agent-profiles`
- `invokes` → `component.backend.backend.src.ai.assistant.agents.agentallowsintent`
- `invokes` → `component.backend.backend.src.ai.assistant.agents.agentid`

## Sequence

| Step | Actor | Operation | State change | Failure branch |
| --- | --- | --- | --- | --- |
| 1 | Trigger actor | `api.backend.post-ai-assistant-query-20` | Defined by cited component | Owning component error contract |
| 2 | ClinicOS runtime | `api.backend.post-internal-ai-assistant-query-70` | Defined by cited component | Owning component error contract |
| 3 | ClinicOS runtime | `api.ai-runtime.get.v1-assistant-llm-health.3` | Defined by cited component | Owning component error contract |
| 4 | ClinicOS runtime | `api.ai-runtime.post.v1-assistant-compose.5` | Defined by cited component | Owning component error contract |
| 5 | ClinicOS runtime | `api.ai-runtime.post.v1-assistant-plan.4` | Defined by cited component | Owning component error contract |
| 6 | ClinicOS runtime | `component.backend.backend.src.ai.assistant.agents.agent-profiles` | Defined by cited component | Owning component error contract |
| 7 | ClinicOS runtime | `component.backend.backend.src.ai.assistant.agents.agentallowsintent` | Defined by cited component | Owning component error contract |
| 8 | ClinicOS runtime | `component.backend.backend.src.ai.assistant.agents.agentid` | Defined by cited component | Owning component error contract |
