# REQ-039 — Acceptance Matrix

Issue #52 — Data Gateway agentico. Branch `req-039-ai-data-gateway`. Date 2026-06-17.

## Scope of this deliverable
The **Node backend AI Data Gateway** — the typed, secure, read-only data path that the Agno runtime
will call (`Agno Agent → ClinicOS Tool Catalog → API interne ClinicOS → Domain service → DB`). This
is the security-bearing layer: typed inputs/outputs, SourceReference on every result, deterministic
backend filters, tenant + patient authorization, PHI-free audit, and NO SQL surface. The Python
Agno tool-catalog (the thin client that wraps these endpoints) is the next layer (REQ-039b).

Note: ClinicOS is **single-tenant** (no tenant field in the schema; changing Prisma is out of scope
per project rules). Tenant isolation is enforced at the gateway: every call is pinned to one
configured tenant (`AI_DEFAULT_TENANT`) and any other tenant id is rejected — a clean seam for future
multi-tenancy without a migration.

| # | Criterion | Method | Final | Evidence |
|---|-----------|--------|-------|----------|
| 1 | All main domains reachable via typed tools | code+integration | PASS | services.ts (patients, demographics, allergies, narrative, vitals, therapies, diary, documents, appointments, timeline, search, correlate) |
| 2 | Agno does NOT access the DB directly | design | PASS | only `/internal/ai/*` exposed; service-token gated; no Prisma in runtime |
| 3 | No generic SQL tool exists | integration | PASS | `/query/sql` → 404; injection string is a literal filter |
| 4 | Every result has a SourceReference | unit+integration | PASS | sources.ts; "every result has SourceReferences" check |
| 5 | Numeric filters run on the backend | unit | PASS | filterVitals systolic>150 test |
| 6 | Narrative searches return exact text | code | PASS | searchClinicalSections excerpt from stored text |
| 7 | Correlations make no clinical conclusion | design | PASS | correlate returns matched patients + sources only |
| 8 | SOURCE_ONLY: no answer without a source | design | PASS | gateway returns only sourced data; not-found → empty (never invented) |
| 9 | Not-found is not invented | integration | PASS | empty arrays + 'empty' audit outcome |
| 10 | Permissions enforced by the backend | unit+integration | PASS | allow-list → 403 outside; context.ts |
| 11 | Tenant isolation verified | unit+integration | PASS | other tenant → 403 |
| 12 | Original documents stay consultable | design | PASS | document content endpoints untouched |
| 13 | Model swappable via Railway | design | PASS | gateway is provider-neutral; runtime model via env (existing) |

## Tests
- backend unit `gateway.test.ts` (11): context/tenant/allow-list/cross-patient gate/service token,
  deterministic vitals + allergy/therapy filters, source builders.
- live integration `api-integration-check.txt` (14/14): token + user-context gates, search with
  sources, tenant isolation, patient allow-list, vitals/timeline sourced envelopes, correlate,
  cross-patient disabled by default, **no SQL endpoint (404)**, injection string is a harmless
  literal filter, patients table intact afterwards.
- full backend suite **123/123**, `tsc` 0.

## Required tests (issue) mapping
name search · fiscal-code · allergy · therapy · vitals range · narrative search · therapy search ·
document search · timeline · two-criteria correlate · no-results · unauthorized patient · different
tenant · source presence · arbitrary SQL attempt — covered across the unit + integration suites.

## Deploy
Backend-only → **Railway**. The Agno Python tool-catalog consuming these endpoints is the next layer.
