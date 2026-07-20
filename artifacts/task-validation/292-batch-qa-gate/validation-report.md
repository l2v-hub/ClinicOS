# Validation Report — QA Gate PR #292 (issues #278–#285)

- **PR**: #292 `fix/issues-278-285-ux-batch` @ `778a2f8a30afbe91397e32a1946bf2dc41ea7038`
- **QA session**: independent (did not author the code; no production code modified)
- **Date**: 2026-07-20
- **Evidence root**: `artifacts/task-validation/292-batch-qa-gate/` (subfolders `278/`…`285/`, `logs/`)
- **Stack under test**: worktree checkout of the PR branch · backend tsx on :3001 (DATABASE_URL →
  e2e Postgres podman `clinicos-e2e-265` on :5433, db `clinicos_test`) · Vite dev on :5173 with
  `VITE_API_URL=http://localhost:3001` · Playwright chromium, 1 worker, specs run serialized.
- Dev-attached evidence exists on every issue (comments at 778a2f8) — noted, NOT accepted;
  everything below was re-run by this session.

## Final Decision: **QA PASSED**

---

## Phase table

| Phase             | Result                                                | Evidence                                                                                  |
| ----------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 0 — Contract      | PASS — 8 issues, 25 AC extracted                      | `task-contract.md`, `logs/issues-278-285.txt`                                             |
| 1 — Diff review   | PASS — no correctness bug; 4 minor non-blocking notes | `logs/pr292-source-full.diff`, findings below                                             |
| 2 — Build & tests | PASS — tsc 0 errors; vite build OK; backend 355/355   | `logs/tsc.log`, `logs/vite-build.log`, `logs/backend-tests-rerun.log`                     |
| 3 — Playwright    | PASS — 10/10 tests across 8 issues, re-run locally    | `<issue>/screenshots/`, `<issue>/test-results/**/trace.zip`, `<issue>/playwright-report/` |
| 4 — Security      | PASS — all rows clear (2 observations)                | table below                                                                               |

### Phase 2 commands (worktree of the PR branch)

```
npm install                                  → exit 0 (511 pkgs)
npm run prisma:generate -w backend           → exit 0
cd frontend && npx tsc --noEmit              → exit 0 ("No errors found")
cd frontend && npm run build                 → exit 0
npm run test -w backend                      → 355 pass / 0 fail (exit 0)
```

Note: the first backend-test run showed 15 file-level failures, ALL `Error: DATABASE_URL is
required` — the worktree lacked the untracked `backend/.env`. After copying the repo's
`backend/.env` (e2e :5433) and starting the podman container, the full suite passes
(`logs/backend-tests.log` = env-less run, `logs/backend-tests-rerun.log` = authoritative run).
The 15 failures are environmental, not PR regressions. The header-filter suite (incl. the 3 new
#279 cases) passes.

### Phase 3 runs (each `node …/@playwright/test/cli.js test --config qa-evidence/playwright.config.ts issue-NNN`, EV_OUT absolute per issue)

| Spec                | Result           |
| ------------------- | ---------------- |
| issue-278 (1 test)  | PASS 12.7s       |
| issue-279 (1 test)  | PASS 1.3s        |
| issue-280 (1 test)  | PASS 12.1s       |
| issue-281 (1 test)  | PASS 6.7s        |
| issue-282 (1 test)  | PASS 9.7s        |
| issue-283 (1 test)  | PASS 5.3s        |
| issue-284 (2 tests) | PASS 3.3s / 3.0s |
| issue-285 (2 tests) | PASS 6.1s / 1.8s |

All specs carry real assertions (visible elements + value checks), console-error and backend
HTTP-4xx/5xx guards (`guard().assertClean()`), and reload-persistence where data is written
(278, 280, 282, 285). Screenshots visually spot-checked (280 form, 281 recap, 283 focus,
284 agenda): rendering correct, synthetic data only.

---

## Per-issue AC verification

### #278 — Anamnesi editabile

| AC                                                        | Verdict | Evidence                                             |
| --------------------------------------------------------- | ------- | ---------------------------------------------------- |
| AC278.1 editor presente, non read-only (bottone Modifica) | PASS    | `278/screenshots/278-anamnesi-persistita.png`, trace |
| AC278.2 modifica persiste dopo reload                     | PASS    | spec assertion post-`page.reload()`                  |
| AC278.3 no console/HTTP errors                            | PASS    | `guard().assertClean()` in spec                      |

### #279 — Header ripetuto rimosso dall'import

| AC                                                    | Verdict | Evidence                                                                                          |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| AC279.1 header tabella su 3 pagine → tenuto una volta | PASS    | unit `#279: table-cell header repeated on 3 pages`; `279/screenshots/279-header-filter-suite.png` |
| AC279.2 contenuto clinico/tabelle terapia intatti     | PASS    | unit `content table (therapy) is NOT treated as a header`                                         |
| AC279.3 banner istituzionale assorbito                | PASS    | unit `repeated institutional banner … absorbed`; suite 355/355, ≥3 nuovi casi #279, exit 0        |

### #280 — Import terapia nel form reale + testo originale

| AC                                                                                              | Verdict | Evidence                                          |
| ----------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------- |
| AC280.1 form reale (TherapyFormFields) precompilato (compressa/500 mg/orale/08:00-20:00)        | PASS    | `280/screenshots/280-form-reale-precompilato.png` |
| AC280.2 testo originale visibile accanto ("Dal documento: …")                                   | PASS    | stesso screenshot + spec assertion                |
| AC280.3 modifica (08:00→09:30) sopravvive alla conferma (therapy API contiene 09:30, non 08:00) | PASS    | spec API assertions su `/patients/:id/therapies`  |
| AC280.4 riga incompleta resta "da verificare"                                                   | PASS    | badge is-verify + data-stato asserted             |

### #281 — Recap finale leggibile

| AC                                                                                      | Verdict | Evidence                                  |
| --------------------------------------------------------------------------------------- | ------- | ----------------------------------------- |
| AC281.1 valori reali (terapie+orari, allergie+gravità, anamnesi, diagnosi, CF/telefono) | PASS    | `281/screenshots/281-recap-leggibile.png` |
| AC281.2 schermata stilata (card con bordo, computed style asserito)                     | PASS    | spec `borderTopWidth !== 0px`             |
| AC281.3 no console/HTTP errors                                                          | PASS    | guard                                     |

### #282 — Bottone "Crea paziente" non più inerte

| AC                                                                            | Verdict | Evidence                                        |
| ----------------------------------------------------------------------------- | ------- | ----------------------------------------------- |
| AC282.1 gate sbloccabile nello step finale (checkbox accept-therapy-verifica) | PASS    | `282/screenshots/282-step-finale-sbloccato.png` |
| AC282.2 bottone si abilita e confirm risponde 201                             | PASS    | spec waitForResponse 201                        |
| AC282.3 paziente persiste dopo reload                                         | PASS    | `282/screenshots/282-paziente-in-lista.png`     |

### #283 — Card "Consegne aperte" mirata

| AC                                                      | Verdict | Evidence                                                       |
| ------------------------------------------------------- | ------- | -------------------------------------------------------------- |
| AC283.1 card → pagina filtrata "Aperte"                 | PASS    | chip attivo asserito; `283/screenshots/283-consegna-focus.png` |
| AC283.2 singola aperta → card evidenziata e in viewport | PASS    | `.consegna-card--focus` + boundingRect in-viewport assertion   |
| AC283.3 sidebar → vista non filtrata, focus azzerato    | PASS    | `283/screenshots/283-sidebar-vista-completa.png`               |

### #284 — Agenda compattata

| AC                                                  | Verdict | Evidence                                                               |
| --------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| AC284.1 slot hour ≤48px, half ≤32px (prima 64/44)   | PASS    | computed min-height asserito                                           |
| AC284.2 ≥13 slot visibili a 1280×800                | PASS    | count in-viewport asserito; `284/screenshots/284-agenda-operatore.png` |
| AC284.3 celle admin hour ≤42px, interazioni intatte | PASS    | `284/screenshots/284-agenda-admin.png`                                 |

### #285 — Persistenza CRUD (orari operatori + agenda reale)

| AC                                                                                      | Verdict | Evidence                                                                                                                  |
| --------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| AC285.1 PUT /operators/:id/schedule → 200; GET /operators/schedules restituisce il dato | PASS    | spec API assertions; DB check diretto: riga `OperatorSchedule` con nota `Turno QA #285 — 1784562651115` presente via psql |
| AC285.2 orari persistono dopo reload                                                    | PASS    | `285/screenshots/285-orari-persistiti.png`                                                                                |
| AC285.3 dashboard senza MOCK_AGENDA (nomi mock assenti)                                 | PASS    | `285/screenshots/285-dashboard-agenda-reale.png`                                                                          |

Gate rule (backend/Prisma): le modifiche `prisma/schema.prisma` + migration `20260720100000_operator_schedule`

- `backend/src/routes/operators.ts` sono richieste da #285 (persistenza su DB); `backend/src/ai/sections/header-filter.ts`
  è richiesta da #279. Nessun'altra superficie backend/API toccata. `VITE_API_URL` non toccato. AMMESSE.

---

## Phase 1 findings (file:line — all non-blocking)

1. `backend/src/routes/operators.ts:112` — `console.log` di successo sul PUT schedule. CONFORME
   alla convenzione esistente delle route (admin-rooms.ts:187+, consegne.ts:53+, note.ts:47+);
   nessun payload clinico loggato (solo operatorId). Non è debug residuo.
2. `frontend/src/components/shared/intake/DischargeTherapyReview.tsx:~30` — lo stato locale
   `forms` viene ri-seedato solo se cambia il NUMERO di righe; una sostituzione esterna di
   `rows` a parità di count mostrerebbe form stantii. Nel flusso reale le righe sono impostate
   una volta per draft → nessun impatto osservato. Minor.
3. `frontend/src/components/operator/ConsegnePage.tsx:63` — `initialFiltroStato` è solo stato
   iniziale: se si è GIÀ sulla pagina Consegne e si riclicca "Consegne" in sidebar, il chip del
   filtro non viene risettato visivamente (il focus sì). Edge-case UX minore; il percorso
   dashboard→consegne rimonta il componente e funziona (validato da spec 283).
4. `frontend/src/App.tsx:~172` — `todayISO` usa `toISOString()` (UTC): vicino alla mezzanotte
   locale il widget "oggi" può s-fasare di un giorno. Minore, coerente col resto del codice data.

- Positivo: `AdminAgenda.tsx` fix `<>` → `<Fragment key={ora}>` corregge un bug di key React reale.
- Design system: token-driven (var(--blue), --red solo per alert "da verificare"/blocchi/valori
  danger); nessuna nav parallela; CRUD color convention invariata; nessun blocco commentato,
  nessun console.log frontend, nessun reformatting estraneo.

## Phase 4 — Security checklist (healthcare)

| Check                         | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secrets in diff/fixtures/logs | CLEAR — scan (api key/secret/password/token/bearer) su tutto il diff sorgente: 0; TAP log in evidence contiene solo nomi test                                                                                                                                                                                                                                                                                                                                                                               |
| PHI                           | CLEAR — fixtures sintetiche (ROSSI MARIA/RSSMRA51S55E000T, Recap281-*, Gatti Lucia seed); 0 occorrenze dei dati reali dell'issue (SABBATANI/MENETTI/SBBLLN) nel diff; screenshot verificati. **Osservazione A**: il body dell'ISSUE GitHub #279 contiene PHI reale (nome, CF, indirizzo, medico) — fuori dal PR ma da redigere lato issue. **Osservazione B**: la fixture unit riusa la data di nascita reale (15/11/1951) con anagrafica altrimenti anonimizzata — rischio residuo trascurabile, segnalato |
| Logging                       | CLEAR — nuovo log solo `operatorId`, nessun payload clinico aggiunto                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Input validation              | CLEAR — PUT schedule: `turni` array obbligatorio (400), operatore esistente (404); blob JSON `data` stesso pattern della cartella                                                                                                                                                                                                                                                                                                                                                                           |
| AuthZ                         | CLEAR — nessun bypass introdotto; le nuove route seguono il modello di auth esistente delle altre route operators/consegne                                                                                                                                                                                                                                                                                                                                                                                  |
| Injection/XSS                 | CLEAR — solo Prisma (upsert/findMany parametrici); 0 `dangerouslySetInnerHTML`; `reportDoc` in helpers esegue escaping HTML                                                                                                                                                                                                                                                                                                                                                                                 |
| Dependencies                  | CLEAR — nessun package.json/package-lock nel PR                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Config                        | CLEAR — vercel.json/CORS/env/prod flags non toccati; SPA rewrite invariata                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## Cleanup

Backend (:3001), Vite (:5173) terminati; container podman `clinicos-e2e-265` fermato (ripristinato
allo stato Exited precedente). Nessun file di codice applicativo modificato da questa sessione.
