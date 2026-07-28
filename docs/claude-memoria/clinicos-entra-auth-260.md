---
name: clinicos-entra-auth-260
description: '#260 Entra ID auth documenti clinici — mergiato (PR #298), fail-closed in prod finché AUTH_MODE=entra + ENTRA_* non configurati; sblocca #277'
metadata:
  node_type: memory
  type: project
  originSessionId: 8ac75c38-1dba-4271-bf9f-bb5bd8973c09
  modified: 2026-07-21T07:41:31.442Z
---

**#260 CHIUSO** (2026-07-21, PR #298 merge `61b14b48`, QA interno adversarial PASSED). Auth production-grade per gli endpoint documenti clinici (`/patients/:id/documents*`).

- Backend `backend/src/lib/entra-auth.ts`: verifica JWT RS256 via **jose** contro JWKS del tenant (firma/issuer/audience/expiry/claim `oid`), mapping server-side su `User.entraObjectId` (colonna unique nullable, migration `20260721090000_user_entra_object_id`), auto-link una-tantum per e-mail verificata (`preferred_username`) solo su account NON già collegati (anti-hijack). Richiesti `isActive` + `Operator`. 401/`WWW-Authenticate`, 403 not_mapped/inactive, 503 fail-closed.
- Gate in `backend/src/routes/patient-documents.ts`: `documentAuthMode()` → `AUTH_MODE=entra` instrada a `requireEntraOperator`; `demo` invariato (non-production, header falsificabili); in entra gli header `X-Operator-*`/`X-Demo-Patient-Id` sono IGNORATI. Scope struttura (operatore mappato+attivo → tutti i pazienti).
- Frontend `frontend/src/lib/entraAuth.ts`: **@azure/msal-browser** PKCE attivo SOLO con `VITE_ENTRA_CLIENT_ID`+`VITE_ENTRA_TENANT_ID`+`VITE_ENTRA_API_SCOPE`; `documentAuthHeaders()` (Bearer + fallback header demo) usato da EsamiConsulenzeTab e ImportedDocumentsList. Senza config la SPA è INVARIATA.
- Test: JWKS **locale reale** (no mock sul percorso di verifica) in `backend/src/__tests__/entra-auth.test.ts` (6) + `patient-documents-entra.test.ts` (4). Suite backend 376/376.

**ATTIVAZIONE (config, nessun codice) — guida `docs/entra-setup.md`:** servono 2 app registration nel tenant (API + SPA). Railway: `AUTH_MODE=entra` + `ENTRA_TENANT_ID` + `ENTRA_AUDIENCE` (+redeploy). Vercel: `VITE_ENTRA_CLIENT_ID` + `VITE_ENTRA_TENANT_ID` + `VITE_ENTRA_API_SCOPE` (+`vercel deploy --prod`). Fino ad allora prod resta **fail-closed 503** (nessuna regressione). Prerequisito mapping: ogni operatore reale deve avere un `User` con e-mail aziendale + `isActive` + record `Operator`.

**Sblocca [[clinicos-batch-278-285-pr292]]-adiacente #277** (bug "apro il documento" = 503 fail-closed by design): a Entra attivo l'endpoint documenti risponde 401→200 autenticato invece di 503. #277 resta `status-blocked` come dipendente da questa config. Il PO fornirà i valori del tenant. Deploy: [[clinicos-deploy-mechanics]].
