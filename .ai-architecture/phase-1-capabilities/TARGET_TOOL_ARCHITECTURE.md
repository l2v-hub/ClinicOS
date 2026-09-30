# Target Tool Architecture — Phase 1

> Source of truth for the Tool Layer contract. Code: `backend/src/tools/**`. Catalog of record:
> `CAPABILITY_CATALOG.json` (same directory).

## 1. Layering

```
GUI (React, frontend/src)          future AI Assistant / Agno runtime (clinicos-ai-runtime)
        │  REST routes (unchanged)          │  HTTP  GET /tools · POST /tools/:name/invoke
        ▼                                   ▼
backend/src/routes/*.ts ─────────►  Application Tool Layer  backend/src/tools/
        │                           registry.ts  (identity → authz hook → schema → patient scope
        │                                         → handler → audit hook → envelope)
        │                           capabilities/<domain>.ts  (thin adapters)
        ▼                                   ▼
        Existing services / business logic (patients/, therapies/, consegne/, services/,
        assessments/, ai/sections, ai/upload, roster/, rooms/, ai/assistant …)
        ▼
        Prisma/Postgres · AIFA · AI runtime
```

- The GUI keeps calling its REST routes and **no route changed its external behaviour**. Where a
  route and a tool must share logic that lived inline in a handler, the handler body was _moved_
  verbatim into a domain module that both call, so a few handlers now delegate (LOCAL REFACTOR, see
  MIGRATION_PLAN.md §1.2–1.4).
- Agno orchestrates tools; it never owns business logic. Today the Python runtime
  (`clinicos-ai-runtime`, Agno used only as a model wrapper) never calls the backend; the
  `/tools` HTTP surface is the contract it will use.

## 2. Tool contract (`backend/src/tools/types.ts`)

| Element            | Convention                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Naming             | `name` = `capability_id` = `<domain>.<verb_object>` (lower snake after the dot), e.g. `consegne.create`, `administration.confirm`, `assessments.finalize`. Stable: renames require a catalog migration entry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Kind               | `read` / `write` / `action`; `auditKind` = read · create · update · delete · action                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Input              | JSON object validated by ajv against `inputSchema`. Path params are top-level (`patientId`, `assessmentId`, …); route query → `query`; route body → `body`. The envelope is strict (`additionalProperties:false`); the inner body/query is validated by the **existing** parser/service (single source of validation).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Output             | `ToolResult` envelope: `{ ok:true, tool, requestId, data }` or `{ ok:false, tool, requestId, error }`. `data` is exactly what the reused service returns (same shape the GUI route serialises).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Error model        | `ToolErrorShape { code, status, message, domainCode?, details? }`. Codes: invalid_input 400 · unauthenticated 401 · forbidden 403 · not_found 404 · conflict 409 · gone 410 · unprocessable 422 · confirmation_required 428 · upstream_error 502 · unavailable 503 · internal 500. Translation (`errors.ts`): errors with a numeric `status` keep it (AssessmentError, RosterError, CartellaUpdateError, ImportSessionError, ConsegnaCreationError …); `*InputError/*QueryError/*ValidationError` → invalid_input; Prisma P2025 → not_found, P2002/P2034 → conflict; per-tool `mapError` mirrors route-specific class mapping (e.g. SlotConflictError → conflict/`slot_conflict`); anything else → internal with a generic message (no clinical text leaks). Out-of-scope patients stay indistinguishable from missing ones (404 `patient_not_found`), as in the routes. |
| Validation         | Envelope: ajv. Content: existing parsers (`parseConsegnaCreateBody`, `parseDiaryCreateBody`, `parseTherapyAdministrationBody`, assessment input modules …). No rule is duplicated in the tool layer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Identity / context | `ToolContext { identity {operatorId, role, name}, origin gui                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | ai  | tool | test, requestId }`. Identity comes only from `requireOperator`(HTTP) or the in-process caller; the input cannot carry identity/role/scope (schema rejects extra keys).`actorOf(ctx)`gives services the`Operator` they already expect. |
| Patient context    | `patientScoped: true` ⇒ `patientId` required and the registry runs `patientIsInOperatorScope` — the exact check of `requirePatientScope`. Services that scope internally (assessments, parameters, consegne …) keep doing so.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Authorization hook | `hooks.ts#setAuthorizationHook`. Phase 1 default = `legacyRoleAuthorization`: tools whose route uses `requireRole('admin','manager')` declare `legacyRoles` and keep that gate; others are open to any authenticated operator (the service applies data scope). Hook errors fail closed (`authorization_unavailable`). `GET /tools` lists only tools the hook allows for the caller. **Phase 2 replaces the hook with the Role/Capability policy registry.**                                                                                                                                                                                                                                                                                                                                                                                                             |
| Audit hook         | `hooks.ts#setAuditHook`. Default sink = existing `AiAuditEvent` table (`recordAuditEvent`, best-effort, never blocks): actionType `tool:<name>`, kind, channel = origin, operatorId/role, patientId, input field NAMES only (PHI-safe), outcome ok/denied/error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Idempotency        | Declared per tool (`requestId` / `natural` / `none`); the mechanism stays in the service (e.g. `ConsegnaCreationReceipt`, parameter-reading `requestId`, assessment `requestId`, diary-with-therapy `requestId`). The registry propagates `requestId` for correlation only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Exposure rules     | Hard deletes are GUI_ONLY (SPEC-015: Agnos is CRU-only; `appointments.delete` UI-only by FR-010). Deprecated/dev endpoints are never tools. External side effects (AIFA reload/download) not exposed in Phase 1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## 3. Invocation pipeline (`registry.ts`)

1. resolve tool (unknown → 404 `tool_not_found`)
2. identity present (else 401)
3. authorization hook (deny → 403 + audit `denied`)
4. ajv envelope validation (→ 400 with paths)
5. patient scope when `patientScoped` (→ 404 `patient_not_found`; DB error → 503)
6. handler → existing service
7. audit hook (ok / error / denied)
8. envelope

Authorization runs before validation so a denied caller learns nothing about the input contract.

## 4. HTTP surface (`tools/http.ts`, mounted at `/tools` in `app.ts`)

- `GET /tools` → `{ tools: ToolDescriptor[] }` filtered by the authorization hook for the caller.
- `POST /tools/:name/invoke` body `{ input, requestId? }` → envelope; HTTP status = `error.status` or 200.
- Chain: `Cache-Control: private, no-store` → `requireOperator` → `importRateLimit` (60/min per
  operator, shared with the other `/ai/*` routers) → per-tool large-body parser → invoke.
- Body limit: the standard 512 kB JSON parser, except tools declaring `maxBodyBytes`
  (`documents.upload`: base64 of 15 MB + headroom). For those exact `POST /tools/<name>/invoke`
  paths `app.ts` skips the standard parser and the tool router parses the body only AFTER
  `requireOperator` (no anonymous large-body parsing; tested).
- `X-Tool-Origin: gui|ai|tool` is client-declared audit metadata only: it is NOT trusted and must
  never be used for authorization (Phase 2 must derive the channel server-side if it matters).

## 5. Agno integration target

- Agno (Python) will build its tool list from `GET /tools` (name, description, inputSchema) per
  end-user identity, and call `POST /tools/:name/invoke` carrying the end-user's token.
- Existing Agnos (TS) orchestrator keeps working unchanged; its write actions that reuse services
  (appointments, consegne, narrative) are aligned with tools; divergent ones (vitals,
  demographics, diary note) are listed as GAP/risks in the catalog and MIGRATION_PLAN.
- The LLM is never the security boundary: every call re-enters the registry pipeline.
