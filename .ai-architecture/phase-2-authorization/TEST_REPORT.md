# Test Report — Phase 2

Environment: disposable local Postgres 18.4 (embedded, scratchpad, `127.0.0.1:54329`), fresh DB
per suite run, all migrations incl. `20260930090000_authz_policy_versions`. Never Railway prod.
Evidence: `artifacts/task-validation/phase-2-roles-authorization-and-capability-policy/`.

## 1. Authorization suites (`backend/src/authz/__tests__`) — 19/19 pass

| File                     | Tests | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `policy-model.test.ts`   |    10 | baseline valid/complete/deny-by-default; legacy roles = today's gates cell by cell; prudent clinical baseline; derived capabilities follow the functional one (incl. `query_data` → `therapy.list`); role resolution; validation (unknown cap/effect, lock-out, legacy fallback, custom role as data); route matcher (literal > param, case-insensitive, trailing/double slash, HEAD = GET); every tool governed; simulator tokens (identity-only, tamper/expiry, prod refusal); registry ⇄ catalog no drift |
| `agno-readiness.test.ts` |     5 | the 7 harness steps (see AGNO_READINESS.md) + path-shape bypass attempts, HEAD, malformed URI (no crash), spoofed headers, no-session refusal                                                                                                                                                                                                                                                                                                                                                                |
| `authz-e2e.test.ts`      |     4 | Doctor end-to-end with confirmation and audit; OSS denied via tool, direct route and Agnos read tool; Administrator least privilege; dynamic Save(draft)/Apply on Nurse with the SAME open session; Agno visibility change; historical integrity; version history before/after; optimistic concurrency 409; restore; policy API protection; lock-out validation; unassignment fallback warning                                                                                                               |

### ALLOW / DENY matrix exercised end-to-end (HTTP, real app)

| Identity (role)               | Capability                    | Channel                                                           | Result                                                             |
| ----------------------------- | ----------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| Doctor 1 (doctor)             | diary.create                  | tool via /tools (ai)                                              | ALLOW → entry authorType `medico`, author `Doctor 1`, audit doctor |
| Doctor 1 (doctor)             | therapy.create                | tool, no confirmation                                             | 428 confirmation_required, nothing written                         |
| Doctor 1 (doctor)             | therapy.create                | tool, confirmed                                                   | ALLOW → therapy `operatoreInseritore = Doctor 1`, audit doctor     |
| OSS 1 (oss)                   | therapy.create                | tool / route / uppercase route / trailing slash / spoofed headers | DENY 403 ×5, nothing written                                       |
| OSS 1 (oss)                   | administration.list_slots     | tool / route / HEAD                                               | DENY 403                                                           |
| OSS 1 (oss)                   | therapies via Agnos assistant | ai read tool                                                      | refusal "non consentito al tuo ruolo"                              |
| Administrator (administrator) | diary write                   | route                                                             | DENY 403 (technical admin, no clinical writes)                     |
| Administrator                 | /admin/rooms                  | route                                                             | ALLOW                                                              |
| Nurse 1 (nurse)               | consegne.create               | route, before / draft saved / after Apply / after restore         | ALLOW / ALLOW / **DENY** / ALLOW (same token)                      |
| Nurse 1                       | /authz/policy                 | route                                                             | DENY                                                               |
| Supervisor 1                  | /authz/policy (view) / save   | route                                                             | ALLOW / DENY                                                       |

### Agno visibility (GET /tools, Agnos catalog)

Doctor vs OSS tool sets differ as per policy (`therapy.create` with `requiresConfirmation` for
Doctor; absent for OSS); Agnos `create_appointment` enabled for Doctor, disabled for OSS; after
Apply the Nurse loses `consegne.create` in `/tools` and `create_consegna` in the Agnos catalog, and
regains them after restore.

## 2. Regression

| Suite                                             | main (76ac4c60)                  | this branch                                                  |
| ------------------------------------------------- | -------------------------------- | ------------------------------------------------------------ |
| Backend, serial, fresh DB                         | 1396 tests · 1374 pass · 21 fail | 1494 tests · 1472 pass · 21 fail — **identical failing set** |
| Frontend `npm test`                               | 908 · 899 · 9 fail               | 924 · 915 · 9 fail — **identical failing set**               |
| Backend build (`prisma generate && tsc && fonts`) | —                                | pass                                                         |
| Frontend build (`tsc -b && vite build`)           | —                                | pass                                                         |

Contract tests adapted (additive API): `src/__tests__/cors-security.test.ts` — `/auth/status` gains
`simulator`, `/auth/me` gains `appRole/roleLabel/roleSource/identitySource/uiShell/policyVersion/
capabilities`; legacy fields asserted exactly as before. Unit tests of `requireOperator` unchanged
(identity step stayed synchronous by design).

## 3. Browser (Playwright library, real frontend + backend)

`qa-evidence/phase2-roles/roles-evidence.mjs` → **10/10 steps, 0 console errors**
(`logs/playwright-results.json`, screenshots `01…14`, traces per identity, videos):
simulator login (5 server identities) · OSS shell without Terapia · Doctor shell · Nurse can create
handovers · Administrator matrix grouped by domain · per-role / per-capability / identities views ·
edit Nurse cell → impact preview (role, lost capability, lost Agnos tool, affected identity) →
confirm → Save & Apply · **persistence after full reload** (history shows the new version + note) ·
the still-open Nurse session loses the create form ("Il tuo ruolo non può creare consegne.") ·
restore → Nurse regains it.

## 4. Independent QA

`clinicos-qa` agent (did not write the code): first verdict FAILED VALIDATION (malformed-URI crash
in the audit path, + 3 MEDIUM); all fixed with regression tests; re-verification **READY FOR QA**.
A case-insensitive-path bypass found during the review (by the lead) was fixed before and verified
by QA live (0 uncatalogued routes; every overlapping route pair maps to the same capability).
Reports: `logs/qa-phase2.md`.
