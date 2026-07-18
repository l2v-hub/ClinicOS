# Task Contract

## Task
- Title: Fix diario VITE_API_URL usa config API_URL
- Slug: fix-diario-vite-api-url-usa-config-api-url
- Type: bugfix
- Date: 2026-07-18

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | yes |

## Current Behaviour

`frontend/src/components/operator/cartella/DiarioPazienteTab.tsx:5` definisce un proprio
`const API_URL = import.meta.env.VITE_API_URL || ''` invece di importare `API_URL` da `src/config.ts`.
`config.ts` risolve correttamente (dev → `http://localhost:3001`, prod → Railway, rispetta `VITE_API_URL`).
Con `VITE_API_URL` non settato in dev, il locale diventa `''` → le fetch del diario vanno relative a `:5173`
(host SPA) e restituiscono HTML → "Errore nel caricamento del diario". Le altre chiamate app usano `config`
e funzionano; solo il diario diverge.

## Expected Behaviour

`DiarioPazienteTab.tsx` importa `API_URL` da `../../../config` e rimuove il locale. Le fetch del diario
usano la stessa base-URL del resto dell'app: in dev caricano da `:3001` senza bisogno di `VITE_API_URL`;
in prod restano sul backend Railway / valore `VITE_API_URL`. Nessun cambio ad altri file, route, o al
valore di `VITE_API_URL`.

## Acceptance Criteria

- AC1: `DiarioPazienteTab.tsx` non definisce più un `API_URL` locale; importa `API_URL` da `src/config.ts`.
- AC2: In dev senza `VITE_API_URL`, il tab Diario carica le voci da `:3001` (nessun "Errore nel caricamento del diario") e le mutazioni (add/edit/delete) usano la stessa base.
- AC3: `cd frontend && npm run build` verde (tsc + vite); nessun cambio a backend/route/env.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | no | Fix di wiring 1-riga |
| Integration | no | |
| API | no | Backend non toccato |
| Playwright | yes | Tab Diario carica voci in dev senza VITE_API_URL (screenshot + rete 200) |
| Persistence after refresh | no | Nessun modello dati cambiato |
| Agnos action registry | no | |
| Voice simulation | no | |
| OCR/import test | no | |
| Security/privacy scan | no | Nessun secret/PHI |

## Evidence Plan

Required evidence:

- validation-report.md
- test output
- screenshots if UI
- Playwright trace if UI
- video if critical flow
- sanitized logs if backend/AI
- API test output if backend
- persistence proof if data is modified

## Risks

<!-- Rischi noti e mitigazioni. -->

## Gate Status

READY FOR IMPLEMENTATION
