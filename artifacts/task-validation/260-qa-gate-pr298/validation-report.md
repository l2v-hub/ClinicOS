# Validation Report — QA Gate PR #298 / Issue #260

**Feature:** Production-grade Azure Entra ID (OIDC) authentication + authorization for clinical document endpoints
**PR head SHA:** `c853e93da704dc510c6455231268fe3c8515cdba` (branch `feat/260-entra-document-auth`)
**Reviewer:** Independent QA gate session (did not author the code). No production code modified.
**Date:** 2026-07-21

## Final Decision: QA PASSED — READY FOR CODEX QA

Rationale: 15-file security diff shows no exploitable path; all unit + gate + full suites green;
an independent adversarial harness (13 attack cases, own JWKS/keypair, beyond the PR's tests) had
**0 attacks accepted**; AC7 verified empirically (0 bytes of module output — no token/e-mail leak).

---

## Phase table

| Phase                              | Scope                                         | Result                              |
| ---------------------------------- | --------------------------------------------- | ----------------------------------- |
| 0 — Contract                       | AC1..AC7 extracted; PO decisions confirmed    | DONE                                |
| 1 — Adversarial diff review        | 15 files, attacker mindset                    | PASS — no exploitable finding       |
| 2 — Build & tests (independent)    | unit / gate / full / tsc x2 / build           | PASS — all green                    |
| 3 — Objective adversarial evidence | 13-case attack harness + Playwright assertion | PASS — 0 accepted, screenshot+trace |
| 4 — Security checklist             | secrets/PHI/logging/authz/deps/config         | PASS                                |
| 5 — Verdict                        | —                                             | **QA PASSED / READY FOR CODEX QA**  |

## Phase 2 — independent build & test results

| Command                                                                  | Expected | Observed                                                                        |
| ------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------- |
| `node --import tsx --test src/__tests__/entra-auth.test.ts`              | 6/6      | **6/6 pass** (`logs/entra-auth.test.log`)                                       |
| `node --import tsx --test src/__tests__/patient-documents-entra.test.ts` | 4/4      | **4/4 pass** (`logs/patient-documents-entra.test.log`)                          |
| `npm run test -w backend` (full)                                         | 376/376  | **376/376 pass** (`logs/backend-full-test.log`)                                 |
| `npx tsc -p tsconfig.json --noEmit` (backend)                            | 0 errors | **0 errors** (`logs/backend-tsc.log`)                                           |
| `npx tsc --noEmit` (frontend)                                            | 0 errors | **0 errors** (`logs/frontend-tsc.log`)                                          |
| `npm run build` (frontend)                                               | 0 errors | **exit 0** — only chunk-size warnings, non-blocking (`logs/frontend-build.log`) |

## Per-AC results

| AC                                                           | Verdict  | Evidence                                                                                                                                                                  |
| ------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 signature/issuer/audience/expiry/claims vs JWKS          | **PASS** | `jwtVerify(token, jwksFor(url), {issuer,audience,algorithms:['RS256']})` (entra-auth.ts:81-85). Attacks 1,2,4,5,7,7b all rejected.                                        |
| AC2 identity from verified claims + server-side mapping      | **PASS** | `oid` → `User.entraObjectId`; e-mail fallback links only UNLINKED accounts (entra-auth.ts:91-124). Attack 3a proves `preferred_username` cannot override the `oid` owner. |
| AC3 operator→patient authz on all 3 endpoints                | **PASS** | `requirePatientDocumentAccess` on POST + GET metadata + GET content (patient-documents.ts:155,194,206). Struttura scope per PO.                                           |
| AC4 401 anon/invalid, 403 forbidden, non-enumerating         | **PASS** | 401 collapses all verify failures to one code (entra-auth.ts:86-88); 403 mapped/inactive (122,124); 404 non-enumerating for patient. Attacks 3b/3c → 403.                 |
| AC5 entra enables verified flow; missing/invalid fail-closed | **PASS** | `entraConfig` returns null on incomplete env → 503 (patient-documents.ts:73-79); `documentAuthMode` defaults `disabled`. Gate test AC5 + pre-existing security test.      |
| AC6 prod never trusts X-Operator-*/X-Demo-Patient-Id         | **PASS** | entra branch never reads those headers; identity set only from claims (entra-auth.ts:149-150). Attack 9 + gate test AC6.                                                  |
| AC7 no token/PHI logged                                      | **PASS** | No `console.*` in changed modules; adversarial run captured **0 bytes** of module stdout/stderr; grep for every token/e-mail used → 0 leaks.                              |

## Phase 3 — adversarial attack cases (own JWKS + RS256 keypair, beyond PR tests)

| #   | Attack                                                          | Expected               | Observed                                | Outcome                    |
| --- | --------------------------------------------------------------- | ---------------------- | --------------------------------------- | -------------------------- |
| 1   | `alg:none` hand-built token                                     | 401                    | 401 token_invalid                       | REJECTED                   |
| 2   | HS256 key-confusion (secret = serialized public JWK)            | 401                    | 401 token_invalid                       | REJECTED                   |
| 3a  | Valid token, victim `oid`, attacker `preferred_username`        | binds to oid owner     | mapped victim, role operator            | CONTROL PASS (no override) |
| 3b  | Valid token, inactive operator                                  | 403                    | 403 identity_inactive                   | REJECTED                   |
| 3c  | Valid signature, unmapped `oid`                                 | 403                    | 403 identity_not_mapped                 | REJECTED                   |
| 4   | Tampered payload + original signature                           | 401                    | 401 token_invalid                       | REJECTED                   |
| 5   | Expired token → reissued fresh                                  | expired 401 / fresh ok | expired 401, fresh ok                   | REJECTED + sanity          |
| 6   | 100 KB junk token                                               | 401, no crash          | 401 in 1 ms                             | REJECTED (bounded)         |
| 7   | Cross-tenant (wrong issuer + foreign key)                       | 401                    | 401 token_invalid                       | REJECTED                   |
| 7b  | Correct issuer, foreign signing key (JWKS mismatch)             | 401                    | 401 token_invalid                       | REJECTED                   |
| 8   | Gate middleware, `alg:none`                                     | 401 + WWW-Authenticate | 401 `Bearer realm="clinicos-documents"` | REJECTED                   |
| 9   | Gate middleware, spoofed X-Operator-*/X-Demo headers, no Bearer | 401                    | 401                                     | REJECTED (AC6)             |
| AC7 | Grep module output for tokens/e-mails                           | 0 leaks                | clean, 0 B captured                     | PASS                       |

**Attacks accepted: 0 / 13.** Playwright chromium assertion of `qa-report.html`:
`accepted=0, okRows=13, badRows=0, consoleErrors=0` → `screenshots/qa-report.png` + `test-results/trace.zip`.

## Phase 1 — security findings (file:line)

No exploitable findings. Positive confirmations:

- `algorithms:['RS256']` passed to `jwtVerify` (entra-auth.ts:84) → jose rejects `alg:none` and HS256 confusion (attacks 1,2 confirm).
- Issuer + audience strictly matched (entra-auth.ts:82-83); issuer pins the tenant so a foreign-tenant token is rejected (attack 7).
- JWKS URL comes from env only (entra-auth.ts:32-34), never from the request → no SSRF surface; cached per-URL (40-48).
- E-mail auto-link updates only accounts with no existing `entraObjectId` (entra-auth.ts:110) → cannot hijack a linked victim (unit test + attack 3a). `preferred_username` is issued by the pinned tenant.
- `.catch(() => null)` on auto-link (entra-auth.ts:117) is fail-closed: a failed link leaves `user` null → 403, never an unauthenticated pass-through.
- No `console.*` / logging of tokens, claims or PHI in `entra-auth.ts`, `patient-documents.ts`, `entraAuth.ts` (grep clean; AC7 runtime-verified).
- Frontend Bearer attached only via `documentAuthHeaders` to `${API_URL}/patients/...` (own backend) — no third-party leak. Token cached in `sessionStorage` (MSAL default; cleared on tab close) — standard SPA tradeoff, acceptable.
- Migration additive only: nullable `entraObjectId TEXT` + unique index (no data loss).

### Notes (non-blocking)

- N1 (LOW/informational): MSAL `sessionStorage` token cache is XSS-reachable — inherent to browser SPA OIDC; documented tradeoff, not a regression.
- N2 (LOW/informational): demo headers still sent alongside the Bearer to the OWN backend; ignored in entra mode by contract. Operator/patient id disclosed only to own backend — acceptable.

## Phase 4 — security checklist

| Row                        | Result                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets in diff/.env       | None. `.env` holds only DATABASE_URL + PORT.                                                                                                   |
| Real tenant values in docs | None — `docs/entra-setup.md` uses placeholders only (`api://<client-id>`, etc.).                                                               |
| Logging of PHI/token       | None (AC7 runtime-verified).                                                                                                                   |
| Input validation           | Bearer parse, RS256-only, oid required, mime sniff on upload unchanged.                                                                        |
| AuthZ                      | Struttura scope enforced via verified mapping on all 3 endpoints.                                                                              |
| Injection                  | Prisma parameterized queries; no string SQL.                                                                                                   |
| Dependencies               | jose 6.2.3, @azure/msal-browser 5.17.1, @azure/msal-common 16.11.2 — all resolved from registry.npmjs.org, exact official names, no typosquat. |
| Config fail-closed         | Missing/invalid AUTH_MODE → `disabled` → 503; demo → `disabled` when NODE_ENV=production (pre-existing security test, in the 376).             |

## Known accepted limitation

Real-tenant SPA end-to-end login (MSAL redirect against the live Azure tenant) is verifiable only after
the PO configures tenant values. Until then production endpoints stay fail-closed (503). The QA bar here
is the synthetic-JWKS middleware flow + adversarial rejection — met.

## Evidence paths (main repo)

- `artifacts/task-validation/260-qa-gate-pr298/task-contract.md`
- `artifacts/task-validation/260-qa-gate-pr298/validation-report.md`
- `artifacts/task-validation/260-qa-gate-pr298/qa-report.html`
- `artifacts/task-validation/260-qa-gate-pr298/attack-results.json`
- `artifacts/task-validation/260-qa-gate-pr298/attack-entra.mjs` (harness), `assert-report.mjs` (Playwright)
- `artifacts/task-validation/260-qa-gate-pr298/screenshots/qa-report.png`
- `artifacts/task-validation/260-qa-gate-pr298/test-results/trace.zip`
- `artifacts/task-validation/260-qa-gate-pr298/logs/*.log` (all build/test/attack output)

## Verdict

**QA PASSED — READY FOR CODEX QA.** Not merged, not closed, not deployed (lead session's responsibility).
