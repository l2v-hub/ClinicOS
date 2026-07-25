---
id: "api.backend.post-ai-voice-plan-39"
kind: "api-endpoint"
title: "POST /ai/voice/plan"
status: "observed"
summary: "POST /ai/voice/plan endpoint implemented by the express runtime."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/ai-voice.ts"
    symbol: "voiceRouter"
    line_start: "47"
    line_end: "71"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-voice.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "post"
last_verified:
  commit: "working-tree"
  inventory_hash: "57c381a02126e2007732515f73987664ea86709cad20b363c4f1047427a9bd9c"
---

## Question Answered

What does `api.backend.post-ai-voice-plan-39` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-voice-plan-39 is the canonical api-endpoint named POST /ai/voice/plan.

## Inputs

- Method: `POST`
- Path: `/ai/voice/plan`
- Request inputs: `["req.body.currentPatientId"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,403]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: None observed
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[403]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/ai-voice.ts:47-71` — voiceRouter

## Related Knowledge

- `belongs-to` → `project.backend`
