# Task Validation Report

## Task
- Title: Fix diario VITE_API_URL usa config API_URL
- Slug: fix-diario-vite-api-url-usa-config-api-url
- Commit: (push in corso)
- Date: 2026-07-18

## Implementation Summary

Bugfix di wiring: `DiarioPazienteTab.tsx` usava un `API_URL` locale (`import.meta.env.VITE_API_URL || ''`)
che in dev senza `VITE_API_URL` diventava `''`, mandando le fetch del diario relative all'host SPA (`:5173`)
→ "Errore nel caricamento del diario". Ora importa `API_URL` da `src/config.ts` (fallback dev `:3001`,
prod Railway, rispetta `VITE_API_URL`), come tutte le altre chiamate dell'app. Rimosso il const locale.
Nessun altro file toccato; nessuna modifica a route/backend/valore di `VITE_API_URL`.

## Files Changed

- `frontend/src/components/operator/cartella/DiarioPazienteTab.tsx` (rimosso `API_URL` locale; `import { API_URL } from '../../../config'`)

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 — niente `API_URL` locale; import da `config.ts` | PASS | diff; grep conferma import + 4 fetch usano il config |
| AC2 — in dev senza `VITE_API_URL` il Diario carica da `:3001`; add/edit/delete stessa base | PASS | Vite avviato con `VITE_API_URL` unset; `GET :3001/…/diary` 200, `POST` 201; card renderizzate, nessun banner errore; persistenza dopo reload |
| AC3 — build verde; nessun cambio backend/route/env | PASS | `logs/qa-build.txt` exit 0 |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Playwright (diario in dev senza VITE_API_URL) | PASS | `screenshots/diario-loaded.png`, `diario-persistence-after-reload.png`; `logs/network-diary.log` (GET 200 / POST 201 su :3001) |
| Build (tsc + vite) | PASS | `logs/qa-build.txt` exit 0 |
| Console/network | PASS | nessun errore fetch; 2 warning nested-`<button>` pre-esistenti (ClinicalTableSection) |
| Security/privacy | PASS | nessun secret/PHI; solo base-URL wiring |

## Runtime Evidence

- `screenshots/diario-loaded.png`, `diario-loaded-fresh.png`, `diario-persistence-after-reload.png`
- `logs/qa-report.md`, `qa-build.txt`, `vite-env.txt` (VITE_API_URL unset), `network-diary.log`, `console-errors.log`

## Logs

Solo log sanitizzati (dati seed sintetici).

## Residual Risks

- Nessuno noto. La fetch del diario ora è coerente con il resto dell'app tramite `config.ts`.
- Pre-esistenti (fuori scope): warning nested-`<button>` in `ClinicalTableSection`; warning ordinamento `@import`.

## Final Decision

CLOSED — VERIFIED

(QA indipendente: Diario carica in dev senza `VITE_API_URL` — GET 200/POST 201 su `:3001`, build verde.
Verdetto READY FOR CODEX QA.)
