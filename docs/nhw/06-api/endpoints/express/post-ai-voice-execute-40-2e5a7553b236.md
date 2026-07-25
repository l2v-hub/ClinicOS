---
id: 'api.backend.post-ai-voice-execute-40'
kind: 'api-endpoint'
title: 'POST /ai/voice/execute'
status: 'observed'
summary: 'POST /ai/voice/execute endpoint implemented by the express runtime.'
bounded_contexts:
  - 'context.ai-assistance'
sources:
  - path: 'backend/src/routes/ai-voice.ts'
    symbol: 'voiceRouter'
    line_start: '74'
    line_end: '93'
    confidence: 'observed'
relations:
  - type: 'belongs-to'
    target: 'project.backend'
    evidence: 'backend/src/routes/ai-voice.ts'
    confidence: 'observed'
tags:
  - 'api'
  - 'express'
  - 'post'
last_verified:
  commit: 'working-tree'
  inventory_hash: '88bfed0fcf4eeef0bf5613885ddf3f844a8a14eace6d862aaf9b2a925afb484c'
---

## Question Answered

What does `api.backend.post-ai-voice-execute-40` represent in ClinicOS?

## Canonical Definition

api.backend.post-ai-voice-execute-40 is the canonical api-endpoint named POST /ai/voice/execute.

## Inputs

- Method: `POST`
- Path: `/ai/voice/execute`
- Request inputs: `["req.body.patientId"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,400]`; response model: `not explicitly declared`.

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

Observed error statuses: `[400]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/ai-voice.ts:74-93` — voiceRouter

## Related Knowledge

- `belongs-to` → `project.backend`
