# Task Validation Report

## Task

- Title: Quality loop 1 responsive shell performance security
- Slug: quality-loop-1-responsive-shell-performance-security
- Branch: `codex/quality-loop-20260829`
- Commit: same commit as this report (`git rev-parse HEAD` after checkout)
- Date: 2026-08-29

## Implementation Summary

Primo incremento verificato localmente su un worktree isolato. Il frontend usa route-level code
splitting, carica Agnos soltanto al primo utilizzo e mostra fallback accessibili anche in caso di
chunk stale. La dashboard operatore rende gli alert clinici separando paziente, farmaco, orario e
ritardo, limita il primo gruppo a tre righe e conserva una griglia KPI a due colonne su mobile.

Il backend fallisce chiuso in produzione se Entra non è esplicitamente configurato, ignora gli
header identità auto-dichiarati in modalità Entra, applica RBAC alle mutazioni amministrative e alle
assegnazioni stanza, espone agli operatori soltanto una directory minimale e usa una allowlist CORS
esatta. Frontend e backend aggiungono header browser difensivi; la CSP consente soltanto il backend
Railway canonico, Microsoft Entra e gli host Google Fonts necessari.

## Files Changed

- `frontend/src/App.tsx`, `frontend/src/App.css`, `frontend/src/app-additions.css`
- `frontend/src/components/operator/OperatorDashboard.tsx`
- `frontend/src/components/operator/cartella/AvvisoAnomalieFarmaci.css`
- `frontend/src/components/shared/TeamsLikeSidebar.tsx`
- `frontend/src/lib/operatorSession.ts`, `frontend/index.html`, `frontend/vercel.json`
- `backend/src/ai/auth.ts`, `backend/src/lib/entra-auth.ts`, `backend/src/app.ts`
- `backend/src/routes/admin-rooms.ts`, `backend/src/routes/operators.ts`
- test auth, CORS/header e RBAC dedicati
- `package.json`, `backend/package.json` e `package-lock.json` allineati a Prisma 7.10.0 dopo
  `npm audit fix` senza `--force`; rimosse anche entry stale
  (incluso `tesseract.js`, assente dai manifest)

`start-claude-team.ps1` presenta soltanto drift di line ending già osservato nel worktree e non deve
essere incluso nel commit.

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | Build Vite: entry 134.62 KiB gzip; chunk separati `PatientDetail` 71.42, `AgnosPanel` 11.75, admin 3.24–5.97 KiB gzip. Agnos assente dal DOM prima del click e dialog presente dopo il primo click. |
| AC2 | PASS | Browser reale a 390×844: client width 375, scroll width 375; riga alert 275×171.8; badge 72×20 con `align-self:start`; KPI verificate su due colonne. Desktop 1280 senza overflow; righe >=44 px. |
| AC3 | PASS | Flusso browser reale: login operatore → dashboard → pazienti → dettaglio → dashboard → apertura/chiusura assistente. Fallback `role=status` e `LazyLoadBoundary` con recovery esplicita. |
| AC4 | PARTIAL | `vercel.json` configura CSP, nosniff, referrer, permissions e anti-frame; backend testa anche HSTS e rimozione `X-Powered-By`. Header Vercel non verificati live perché il deploy è bloccato dalle credenziali/config Entra. |
| AC5 | PASS | Build completa PASS; frontend 148/148; security/RBAC 17/17; Agnos/voice 93/93; lint mirato frontend/backend PASS; secret scan 0 findings. Audit residuo: 3 high transitivi Prisma/deepmerge-ts, fix disponibile solo tramite downgrade breaking. |
| AC6 | PASS | Suite Agnos/voice 93/93: catalogo CRU-only, zero delete, conferma obbligatoria, re-grounding e idempotenza testati. Nessuna modifica amplia il catalogo azioni. |
| AC7 | PASS (code) | Test negativi: produzione demo/header falsificati → 503 fail-closed; Entra usa token verificato e mapping DB server-side; `/auth/me` restituisce identità/nome/ruolo risolti dal server alla UI; operatori non possono accedere a profili completi né mutation admin/stanze. Environment production non ancora verificato. |
| AC8 | PASS | Test dedicato rifiuta `clinicos-evil.vercel.app` e suffissi malevoli; soltanto origin esatte configurate sono accettate. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | Frontend node tests: 148 pass, 0 fail. |
| Integration | PARTIAL | Navigazione/lazy loading browser PASS; suite DB completa non eseguita perché nessun PostgreSQL di test è disponibile. |
| API | PASS (focused) | Auth/CORS/header/RBAC: 17 pass, 0 fail. |
| Playwright/browser | PASS (local) | Viewport desktop/mobile, DOM semantico, navigazione e assistente verificati su `http://localhost:3000`. |
| Persistence | NA | Nessuna mutazione dati eseguita in questo ciclo. |
| Agnos AI | PASS | 93 test actions/plan/voice/privacy; nessuna delete e conferme preservate. |
| Voice | PASS (logic) | Incluso nei 93 test; nessuna prova microfono/STT live in questo ciclo. |
| OCR | NA | Non modificato. |
| Security/privacy | PARTIAL | Secret scan PASS, 17 test focused PASS; 3 high transitivi residui e nessun DAST live. |

## Runtime Evidence

- Baseline frontend: entry 1,586.61 KiB / 435.84 KiB gzip.
- Candidate frontend: entry 483.16 KiB / 134.62 KiB gzip (`-69.1%` gzip).
- CSS iniziale: 39.55 KiB gzip, sotto il gate di 75 KiB.
- Nessun chunk applicativo supera 500 KiB; il worker PDF separato resta 1.26 MiB non gzip nel report.
- Dashboard locale legge il dataset demo production via backend consentito per `localhost:3000`.
- Assistente: launcher presente subito; chunk/dialog montato soltanto dopo il primo click.

## Logs

Sono stati usati soltanto output sanitizzati. Le suite Agnos hanno segnalato l'assenza del database di
test durante l'audit best-effort; i 93 test logici sono comunque passati e questo comportamento
preesistente è riportato come rischio, non come prova di persistenza.

## Residual Risks

- Release bloccata: CLI Vercel e GitHub CLI non autenticati; il valore locale
  `VERCEL_OIDC_TOKEN` non è un token CLI valido.
- Prima del backend deploy devono essere verificati `AUTH_MODE=entra`, `ENTRA_TENANT_ID`,
  `ENTRA_AUDIENCE` e le variabili frontend `VITE_ENTRA_*`; altrimenti il fail-closed rende le API
  indisponibili, come previsto.
- Mancano PostgreSQL di test, smoke test Entra live, DAST/ZAP, axe e load test su dataset voluminoso.
- `npm audit` conserva 3 high in Prisma CLI → `deepmerge-ts`; `npm audit fix --force` propone un
  downgrade breaking e non è stato applicato.
- Rimangono debiti già identificati: ownership/ABAC su job AI e bozze intake, attore clinico fornito
  in alcuni body, query/paginazioni non bounded e audit AI best-effort.
- Il lint globale del repository ha debito preesistente; il lint mirato dei file modificati passa.

## Independent Review

Il primo review ha restituito FAIL su RBAC assegnazioni stanza, letture operatori, caricamento eager
di Agnos e CSP permissiva. Tutti e quattro i punti sono stati corretti. Il secondo review ha
restituito PARTIAL esclusivamente per i gate live/scala residui e ha confermato le correzioni; le
origin localhost sono state poi rimosse anche dall'allowlist production e la UI Entra ora usa
`/auth/me` invece del ruolo selezionato localmente.

## Final Decision

PARTIAL

Il candidato è verificato localmente ma non è pubblicabile finché configurazione Entra e credenziali
di deploy non sono disponibili e gli header non vengono verificati sulla URL production.
