# Task Contract

## Task

- Title: Entra ID production-grade per documenti clinici
- Slug: entra-id-production-grade-per-documenti-clinici
- Type: feature (security)
- Date: 2026-07-21
- Issue: #260

## Impact Classification

| Area                 | Impacted |
| -------------------- | -------: |
| Frontend/UI          |      yes |
| Backend/API          |      yes |
| Database/Persistence |      yes |
| Agnos AI / Chatbot   |       no |
| Voice                |       no |
| OCR / Import         |       no |
| Auth / Permissions   |      yes |
| Privacy / Security   |      yes |
| Config / Env         |      yes |

Schema/backend/config changes explicitly required by the issue (po-ready, assigned-to-claude).

## Decisioni PO (2026-07-21)

- Validazione JWT backend: libreria **jose** (nuova dipendenza approvata).
- Acquisizione token SPA: **@azure/msal-browser** (nuova dipendenza approvata).
- Autorizzazione operatore→paziente: **scope struttura** — ogni operatore autenticato, mappato e
  attivo accede ai documenti di tutti i pazienti; il vincolo forte è l'identità verificata + il
  mapping server-side, non l'assegnazione per paziente.
- Config env-driven; i valori reali del tenant (ENTRA_TENANT_ID, audience, client id SPA) saranno
  forniti dal PO dopo la consegna; fino ad allora `AUTH_MODE=entra` resta attivabile solo con
  config completa (fail-closed altrimenti).

## Current Behaviour

- Endpoint documenti (`/patients/:id/documents*`) gated da `requirePatientDocumentAccess`:
  `AUTH_MODE=demo` (solo non-production) usa header falsificabili `X-Operator-*` +
  `X-Demo-Patient-Id`; `AUTH_MODE=entra` risponde 503 "non ancora disponibile"; altrimenti 503
  fail-closed (è il 503 della issue #277).
- Nessuna validazione JWT nel backend; la SPA non possiede token (Entra è solo sull'edge Vercel).
- Nessun mapping identità→operatore: `User.email` esiste, nessun object id Entra.

## Expected Behaviour

- Backend `AUTH_MODE=entra` con config completa: le tre route documenti richiedono
  `Authorization: Bearer <JWT>`; verifica firma (JWKS remoto con cache, RS256), issuer
  (`https://login.microsoftonline.com/<tenant>/v2.0`), audience, expiry e claim richiesti via
  `jose`. Identità e ruolo derivati SOLO dai claim verificati + mapping server-side:
  `User.entraObjectId` (claim `oid`) con fallback una-tantum su email verificata
  (`preferred_username`) e auto-link dell'oid; richiesti `User.isActive` e record `Operator`.
- Scope struttura: operatore mappato e attivo → accesso documenti di ogni paziente esistente.
- 401 con `WWW-Authenticate` per token assente/malformato/scaduto/forgiato/issuer o audience
  errati; 403 per utente non mappato/disattivato; 404 non-enumerante per paziente inesistente.
- In modalità entra gli header `X-Operator-Id`/`X-Operator-Role`/`X-Demo-Patient-Id` sono
  IGNORATI come fonte di identità (AC6); demo resta esplicito e solo non-production (invariato).
- Nessun token, byte documento o PHI nei log: solo esiti/codici (AC7).
- SPA: `@azure/msal-browser` (PKCE) attivo solo se `VITE_ENTRA_CLIENT_ID` configurato —
  acquisizione silente del token per lo scope API e header Bearer sulle chiamate documenti;
  senza config la SPA mantiene invariato il flusso demo attuale.

## Acceptance Criteria (dalla issue #260)

- AC1: firma, issuer, audience, expiry e claim richiesti verificati contro JWKS Entra.
- AC2: identità e ruolo solo da claim verificati + mapping server-side (`entraObjectId`).
- AC3: autorizzazione operatore→paziente su upload, metadata e content (scope struttura).
- AC4: anonimo/invalido → 401; ruolo/utente vietato → 403; paziente inesistente → 404 non-enumerante.
- AC5: `AUTH_MODE=entra` abilita il flusso verificato; valori mancanti/invalidi restano fail-closed.
- AC6: la produzione non accetta mai `X-Operator-Id`/`X-Operator-Role`/`X-Demo-Patient-Id` come identità.
- AC7: nessun token, byte documento, contenuto clinico o PHI nei log.

## Test Plan

| Test type                 | Required | Reason                                                                                                                                                                                                                |
| ------------------------- | -------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit                      |      yes | verifica claim/mapping; token forgiato/scaduto/issuer errato/audience errata/chiave diversa → 401; non mappato → 403 (JWKS locale sintetico + SignJWT di jose)                                                        |
| Integration               |      yes | route documenti attraverso l'app Express con AUTH_MODE=entra e JWKS di test (ENTRA_JWKS_URL override)                                                                                                                 |
| API                       |      yes | negativi 401/403/404 + positivo 200 con token valido                                                                                                                                                                  |
| Playwright                |      yes | superficie QA (il tenant Entra reale non è disponibile in locale: evidenza = flusso API con token sintetici + report HTML asserito e screenshot; il login SPA reale sarà verificabile solo dopo la config del tenant) |
| Persistence after refresh |       no | nessun dato clinico modificato                                                                                                                                                                                        |
| Agnos action registry     |       no | non toccato                                                                                                                                                                                                           |
| Voice simulation          |       no | non toccato                                                                                                                                                                                                           |
| OCR/import test           |       no | non toccato                                                                                                                                                                                                           |
| Security/privacy scan     |      yes | nessun token/PHI nei log; secret scan; dipendenze verificate (jose, msal-browser da registry ufficiale)                                                                                                               |

## Evidence Plan

- validation-report.md con output test unit/integration/API
- log sanificati (soli codici esito)
- superficie QA + screenshot per il gate

## Risks

- I valori reali del tenant arrivano dopo: l'attivazione prod resta fail-closed finché la config
  non è completa — consegna con guida di configurazione (app registration API + SPA).
- MSAL introduce un flusso di login nella SPA: attivo SOLO con `VITE_ENTRA_CLIENT_ID` settato, per
  non toccare il flusso demo/dev corrente.
- Migration additiva `User.entraObjectId` unique nullable: nessun impatto sui dati esistenti.

## Gate Status

READY FOR IMPLEMENTATION
