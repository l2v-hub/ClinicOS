---
id: "api.backend.get-ai-audit-21"
kind: "api-endpoint"
title: "GET /ai/audit/"
status: "observed"
summary: "GET /ai/audit/ endpoint implemented by the express runtime."
bounded_contexts:
  - "context.ai-assistance"
sources:
  - path: "backend/src/routes/ai-audit.ts"
    symbol: "auditRouter"
    line_start: "29"
    line_end: "69"
    confidence: "observed"
relations:
  - type: "belongs-to"
    target: "project.backend"
    evidence: "backend/src/routes/ai-audit.ts"
    confidence: "observed"
  - type: "reads"
    target: "data.model.aiauditevent"
    evidence: "backend/src/routes/ai-audit.ts"
    confidence: "observed"
tags:
  - "api"
  - "express"
  - "get"
last_verified:
  commit: "working-tree"
  inventory_hash: "91ba390d6277c9753e3367cb5ab8941399c9a8588ccce0b39406f08b8eee6c79"
---

## Question Answered

What does `api.backend.get-ai-audit-21` represent in ClinicOS?

## Canonical Definition

api.backend.get-ai-audit-21 is the canonical api-endpoint named GET /ai/audit/.

## Inputs

- Method: `GET`
- Path: `/ai/audit/`
- Request inputs: `["req.query.from","req.query.limit","req.query.operatorId","req.query.outcome","req.query.patientId","req.query.to"]`
- Middleware/dependencies: None observed

## Outputs

Observed HTTP statuses: `[200,403,500]`; response model: `not explicitly declared`.

## Dependencies

Persistence calls: `["prisma.aiAuditEvent.findMany"]`
External calls: None observed
Background tasks: None observed

## Side Effects

None observed

## Consumers

Frontend request consumers and external HTTP clients matching this method and path.

## Invariants

The complete mounted path is reconstructed from the runtime composition root.

## Failure Modes

Observed error statuses: `[403,500]`. Handler-level triggers remain at the cited source span.

## Evidence

- `backend/src/routes/ai-audit.ts:29-69` — auditRouter

## Related Knowledge

- `belongs-to` → `project.backend`
- `reads` → `data.model.aiauditevent`
