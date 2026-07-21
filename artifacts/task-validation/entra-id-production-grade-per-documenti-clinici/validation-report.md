# Task Validation Report

## Task
- Title: Entra ID production-grade per documenti clinici
- Slug: entra-id-production-grade-per-documenti-clinici
- Issue: #260
- Commit: (branch `feat/260-entra-document-auth`)
- Date: 2026-07-21

## Implementation Summary

- `backend/src/lib/entra-auth.ts` (nuovo): verifica JWT RS256 con `jose` contro il JWKS del
  tenant (cache con cooldown) — firma, issuer (`login.microsoftonline.com/<tenant>/v2.0`),
  audience, expiry, claim `oid` richiesto. Mapping identità SERVER-SIDE: `User.entraObjectId`
  (oid) con fallback una-tantum su e-mail verificata (`preferred_username`) e auto-link; un
  account già collegato ad altro oid non è mai ri-agganciato (anti-hijack). Richiesti
  `User.isActive` + record `Operator`. Fallimenti tipizzati: 401 (token assente/invalido, con
  `WWW-Authenticate`) / 403 (non mappato, disattivato); errori inattesi → 503 fail-closed.
  Il modulo non logga mai token/claim/PHI (solo codici esito nelle risposte).
- `backend/src/routes/patient-documents.ts`: `AUTH_MODE=entra` ora instrada al middleware
  verificato (config incompleta → 503 fail-closed); `demo` invariato (esplicito,
  non-production); in modalità entra gli header `X-Operator-*`/`X-Demo-Patient-Id` sono ignorati.
- `prisma/schema.prisma` + migration `20260721090000_user_entra_object_id`: colonna additiva
  `User.entraObjectId TEXT UNIQUE` (nullable).
- `frontend/src/lib/entraAuth.ts` (nuovo): MSAL (`@azure/msal-browser`, PKCE) attivo SOLO con
  `VITE_ENTRA_CLIENT_ID`+`VITE_ENTRA_TENANT_ID`+`VITE_ENTRA_API_SCOPE`; acquisizione silente con
  fallback redirect; `documentAuthHeaders()` produce Bearer + header demo (ignorati dal backend
  in entra). Call-site aggiornati: `EsamiConsulenzeTab` (list/upload/content),
  `ImportedDocumentsList` (list/content). Senza config la SPA è INVARIATA.
- `docs/entra-setup.md`: guida di attivazione (2 app registration + env Railway/Vercel + mapping).
- Dipendenze approvate dal PO: `jose@6` (backend), `@azure/msal-browser@5` (frontend).

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 firma/issuer/audience/expiry/claim vs JWKS | PASS | `entra-auth.test.ts` — JWKS locale REALE, 8 casi negativi (forged key, expired, wrong issuer/audience, no oid, garbage) tutti 401 |
| AC2 identità/ruolo solo da claim + mapping server-side | PASS | test oid pre-linked, auto-link e-mail (persistito), anti-hijack (oid diverso NON ri-aggancia) |
| AC3 authz operatore→paziente (scope struttura, decisione PO) | PASS | gate test: operatore mappato+attivo → next() con `req.operator` dal DB |
| AC4 401 anonimo/invalido, 403 vietato, 404 non-enumerante | PASS | 401 con WWW-Authenticate; 403 not_mapped/inactive; POST paziente inesistente → 404 (invariato) |
| AC5 entra abilita il flusso; config incompleta fail-closed | PASS | `entraConfig` null-cases + gate 503 `document_auth_unavailable` |
| AC6 produzione mai header autodichiarati come identità | PASS | gate test: header spoofed senza Bearer → 401 (mai next) |
| AC7 nessun token/PHI nei log | PASS | il modulo non contiene logging; risposte solo con codici |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit entra-auth (JWKS locale reale) | PASS 6/6 | `node --import tsx --test src/__tests__/entra-auth.test.ts` |
| Gate route-level entra | PASS 4/4 | `src/__tests__/patient-documents-entra.test.ts` |
| Backend suite completa | PASS 376/376 | `npm run test -w backend` (Postgres e2e :5433, migration applicata) |
| Typecheck backend + frontend | PASS 0 errori | `npx tsc --noEmit` |
| Frontend build | PASS | `vite build` |
| Playwright | PENDING QA GATE | superficie QA con flusso a token sintetici (il tenant reale non è disponibile in locale) |

## Residual Risks

- Login SPA reale verificabile solo dopo la configurazione del tenant (guida `docs/entra-setup.md`);
  fino ad allora prod resta fail-closed (503) — identico allo stato attuale, nessuna regressione.
- `acquireTokenRedirect` ricarica la pagina al primo login: accettato (flusso SPA standard).

## Final Decision

IMPLEMENTED — NOT VERIFIED

(In attesa del gate QA interno indipendente.)
