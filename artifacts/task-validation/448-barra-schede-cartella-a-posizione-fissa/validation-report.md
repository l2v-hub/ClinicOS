# Task Validation Report

## Task
- Title: 448 barra schede cartella a posizione fissa
- Slug: 448-barra-schede-cartella-a-posizione-fissa
- Issue: #448
- Commit: branch `ux3/448-tabbar-stable` (hash nel commit che contiene questo report)
- Date: 2026-10-12

## Implementation Summary

Causa: il `WidgetGroup` di pagina (in `App.tsx`) mostra «Apri/Chiudi tutte le sezioni» sopra il
contenuto quando sono registrati più di un widget. Nella cartella succede in Panoramica, Dati di
ingresso e Clinica, ma non in Terapia, Parametri, Moduli, Documenti e Dimissione: la barra delle
schede saltava di 60 px.

Fix: `WidgetGroup` accetta `controls` (default `true`). `App.tsx` passa
`controls={navKey !== 'dettaglio-paziente'}`. Nella cartella il comando sparisce e ogni sezione
mantiene il proprio toggle, come previsto dalla proposta della issue. Fuori dalla cartella non
cambia nulla.

Seconda causa, emersa dal QA indipendente: fra 601 e 1023 px le 8 chip (`top-nav--chips`) non
entravano in una riga (794 px di contenuto in 736 px a 768) e la riga scorreva in orizzontale, quindi
le chip si spostavano sotto il dito cambiando scheda. In `app-additions.css` le chip vanno a capo
fra 601 e 1023 px; a ≤600 px resta la riga unica scorrevole (contratto in CLAUDE.md).

## Files Changed

- `frontend/src/components/shared/WidgetGroup.tsx` — prop `controls`
- `frontend/src/App.tsx` — `controls={navKey !== 'dettaglio-paziente'}`
- `frontend/src/app-additions.css` — chip a capo fra 601 e 1023 px
- `frontend/src/components/shared/__tests__/widgetGroupControls.test.ts` — nuovo test
- `frontend/src/lib/__tests__/manualIntakeNavigation.test.ts` — regex tollerante all'a-capo
- `scripts/e2e/issue-448-tabbar.mjs` — misura Playwright

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 | PASS | `test-results/tabbar-after.json`: barra a 72 px in tutte le 8 schede, spread 0 px a 1180×820, 1024×768 e 768×1024. Ogni chip resta nello stesso punto in tutte le schede (±3 px orizzontali per il grassetto della chip attiva, 0 px verticali). Baseline `tabbar-before.json`: 132 → 72 px (spread 60 px); a 768 la riga scorreva (contenuto 794 px in 736 px) |
| AC2 | PASS | `controlsAbove` = 0 in tutte le schede dopo la fix (prima 4 per viewport) |
| AC3 | PASS | Conteggio di `.widget-group-controls` sulle pagine della sidebar identico prima e dopo (Turno 1, altre 0). tsc + build verdi, unit 1344/1344 |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS | `logs/unit-tests.log` (1344/1344, compreso il nuovo `widgetGroupControls.test.ts`) |
| Integration | NA | |
| API | NA | nessuna modifica backend |
| Playwright | PASS | `scripts/e2e/issue-448-tabbar.mjs`, `logs/playwright-after.log`, `trace/*.zip`, `screenshots/`; telefono `logs/phone-probe.log` (390 e 600 px: una riga scorrevole, nessuno scroll di pagina; 601 px: a capo) |
| Persistence | NA | nessun dato modificato |
| Agnos AI | NA | |
| Voice | NA | |
| OCR | NA | |
| Security/privacy | NA | modifica solo di layout |

## Runtime Evidence

Stack locale sintetico: Postgres embedded (DB `uxaudit` dell'audit 11/10, paziente demo Nanni
Miriam), backend `AUTH_MODE=demo` con simulatore su :3111, vite su :5211, ruolo Infermiere 1.
La baseline è stata misurata con lo stesso script su un worktree `origin/main` (59baeb86a).

- Prima: `baseline/before-1180-panoramica.png` (barra a 132 px, «Chiudi tutte le sezioni» sopra) e
  `baseline/before-1180-terapia.png` (barra a 72 px).
- Dopo: `screenshots/1180x820-*.png`, `screenshots/1024x768-*.png`, `screenshots/768x1024-*.png` (barra sempre a 72 px; a 768 px due righe fisse, «Dimissione» sulla seconda).

## Logs

`logs/build.log`, `logs/unit-tests.log`, `logs/playwright-after.log`. Console del browser: 2
warning React per `key` mancante in `AllergiesEditor`, identiche prima e dopo (preesistenti, fuori
scope).

## Residual Risks

- Nella cartella non c'è più «Chiudi/Apri tutte le sezioni». La issue lo accetta («oppure sparisce»)
  e i toggle per sezione restano.
- Verifica su stack locale sintetico, non su prod (prod dietro Entra).
- Il pulsante «indietro» della barra in alto compare solo dopo la prima navigazione (dipende dalla
  cronologia, non dalla scheda). Sposta il nome di lato, non la barra delle schede.
- Le chip vanno a capo fra 601 e 1023 px: a 768 «Dimissione» sta da sola sulla seconda riga.

## Final Decision

CLOSED — VERIFIED
