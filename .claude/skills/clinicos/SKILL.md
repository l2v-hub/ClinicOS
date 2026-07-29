---
name: clinicos
description: Usa quando si lavora su ClinicOS — gestionale clinico RSA con frontend React/Vite, backend Express/Prisma, Postgres e runtime AI Python — per sapere com'e' fatto, come avviarlo, quali regole valgono e quali trappole evitare. Serve sia come briefing iniziale su una postazione nuova o fuori dal repository, sia come indice verso CLAUDE.md, i documenti in docs/ e le skill di progetto. Parole chiave: ClinicOS, RSA, cartella clinica, terapie, diario, Agnos, import OCR, anagrafica farmaci AIFA, quality gate.
---

# ClinicOS

Gestionale clinico full-stack per RSA: anagrafica pazienti, cartella clinica, terapie
farmacologiche, diario, consegne, agenda con letti e stanze, importazione documenti di dimissione
via OCR/LLM e assistente AI (Agnos).

**Questa skill e' un briefing e un indice.** La verita' operativa vive nel repository: quando ci sei
dentro, `CLAUDE.md` e i documenti citati qui sotto vincono su questo file.

## Architettura

```
frontend/  React 19 + Vite + TypeScript      :5173
backend/   Express + Prisma + TypeScript     :3001
prisma/    schema.prisma alla ROOT (28 model), non dentro backend/
clinicos-ai-runtime/  servizio Python FastAPI + Agno, deploy separato su Railway
e2e/       script Node .mjs guidati da Playwright (non @playwright/test)
agent-team/  CLI di orchestrazione agenti (non e' una feature del prodotto)
```

Il runtime AI isola **tutta** la conoscenza di modelli e provider: si cambia modello toccando una
variabile Railway, mai il codice di backend o frontend.

**Niente framework UI pesanti, niente react-router.** Le dipendenze frontend sono react, react-dom,
`@azure/msal-browser` (Entra), `tesseract.js`, `codice-fiscale-js` — e basta. La navigazione e'
scritta a mano in `App.tsx`, che e' un monolite da ~60 KB affiancato da ~76 componenti sotto
`frontend/src/components/{admin,navigation,operator,shared}`. Non esiste `frontend/src/pages/`.

Backend: 22 moduli di rotte in `backend/src/routes/`, piu' `ai/`, `intake/`, `services/`,
`therapies/`, `lib/`. Modelli Prisma centrali: `Patient`, `Cartella`, `ClinicalRecord`,
`PatientTherapy`/`TherapySchedule`, `PatientDiaryEntry`, `Appointment`, `Room`/`Bed`,
`ImportJob`/`ImportDocument`, `AiAuditEvent`.

## Avviare in locale

```bash
npm install                                   # dalla ROOT: e' un workspace npm
npm --prefix backend run prisma:generate      # obbligatorio, o il client non esiste
npm run dev                                   # frontend :5173 + backend :3001
```

Database locale in container Podman su `localhost:5433/clinicos_test`:

```bash
podman machine start && podman start clinicos-e2e-265
podman exec clinicos-e2e-265 pg_isready -U postgres
```

**Senza database 28 test del backend falliscono per connessione rifiutata** — non e' un difetto del
codice. Per avviare o pilotare l'app usa la skill `run-clinicos`.

## Regole non negoziabili

**Quality Gate.** Nessuna modifica al codice applicativo senza
`artifacts/task-validation/<slug>/task-contract.md`
(`node scripts/quality-gate/create-task-contract.js "<titolo>"`).
Nessun "done", "fatto", "risolto" senza `validation-report.md` con
`Final Decision: CLOSED — VERIFIED`. In assenza di validazione lo stato e' `IMPLEMENTED — NOT
VERIFIED`, `FAILED VALIDATION`, `BLOCKED` o `PARTIAL`. Due hook lo impongono davvero. Skill:
`agent-loop-quality-gate`.

**Design system.** Blu medicale `#2F6BED`, sidebar navy, pagina `#EEF1F6`. Il **rosso e' riservato
agli allarmi clinici, agli errori e ai badge di conteggio**: mai come colore di brand o di stato
attivo. Navigazione unificata: `TeamsLikeSidebar` (L1) + `TopNav` con `variant="level2"|"level3"` —
non creare componenti di navigazione paralleli.

**Confini.** Non toccare backend, schema Prisma, rotte API o `VITE_API_URL` se non e' esplicitamente
chiesto. Preferire modifiche chirurgiche: per un fix di layout non si rifa' il design system.

**Prima di committare frontend**: `cd frontend && npm run build` (`tsc -b && vite build`) deve
passare.

## Deploy

| Cosa       | Come                                                               | Quando                                              |
| ---------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| Frontend   | **manuale**: `vercel deploy --prod --archive=tgz --yes` dalla root | solo se l'utente dice "deploy" dopo un fix validato |
| Backend    | **automatico** via GitHub Actions su push a `main`                 | da solo                                             |
| AI runtime | Railway, servizio separato                                         | da solo                                             |

Il push su `main` **non** deploya il frontend: solo quel comando lo fa, e chiama il binario globale
`vercel` (con `npx` un hook di shell lo riscrive in `npm`). Skill: `spedire-modifica` per l'intero
percorso commit → PR → CI → merge → deploy.

**La produzione e' dietro autenticazione Entra/OIDC**: un `curl` anonimo prende 403, quindi non si
verifica prod via curl. Si verifica con Playwright in locale e si chiede all'utente un hard-reload
(Ctrl+Shift+R) da autenticato.

## Trappole che costano ore

- **`rtk` filtra l'output di git.** Un `git diff` vuoto non prova che due alberi siano uguali. Per il
  git di plumbing usa `rtk proxy git ...`. Intercetta anche `find` con predicati composti.
- **Account GitHub sbagliato = 403.** Il repo e' `l2v-hub/ClinicOS`: `gh auth switch --user l2v-hub`.
- **`npm install` dalla ROOT.** Dalle sottocartelle il workspace non si risolve. In un worktree,
  install dal root del worktree + `prisma:generate`, sempre.
- **`prepare` in package.json deve essere `husky || exit 0`.** Un `husky` nudo rompe l'install in CI
  e in produzione con exit 127.
- **In CI le e2e devono avere `VITE_API_URL`.** Una build di produzione senza quella variabile
  ricade sul backend Railway **vero** (`frontend/src/config.ts`): i test passano colpendo la
  produzione.
- **`vercel.json`**: la rewrite SPA deve restare `"/((?!assets/).*)"`. Una catch-all serve
  `index.html` al posto dei chunk mancanti → errori "MIME type text/html".
- **Build che muore con `ENOSPC`**: e' il disco pieno, non il codice. `df -h /c`,
  `npm cache clean --force`, e la skill `claude-home-cleanup` per `~/.claude`.

## Dove guardare

| Serve                            | File                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| Istruzioni complete di progetto  | `CLAUDE.md`                                                |
| Ripartire da un'altra postazione | `docs/setup-postazione.md`                                 |
| Memoria di Claude versionata     | `docs/claude-memoria/` (`MEMORY.md` e' l'indice)           |
| Il manifesto del progetto        | `.specify/memory/constitution.md`                          |
| Metodo di validazione e gate     | `docs/quality-gate.md`, `docs/validation-method.md`        |
| Stato aperto dei task            | `artifacts/task-validation/<slug>/validation-report.md`    |
| Requisiti e coda                 | `requirements/`, `.claude/workflows/REQUIREMENTS_QUEUE.md` |
| Spec delle feature               | `specs/`                                                   |

Lo stato reale del lavoro si legge cercando i `validation-report.md` che **non** riportano
`CLOSED — VERIFIED`.

## Quale skill usare quando

```
richiesta di sviluppo → agent-loop-quality-gate   (task contract, obbligatorio)
avviare o pilotare l'app → run-clinicos
prove oggettive di una UI → playwright-evidence
prima di aprire una PR → qa-gate
issue senza evidenze → parallel-evidence-remediation
requisito da GitHub issue → process-requirement
nuova tab clinica → new-clinical-tab
portare in produzione → spedire-modifica
disco pieno / ~/.claude gonfia → claude-home-cleanup
```

## Se non sei dentro il repository

Questa skill e' il contesto minimo per ragionare su ClinicOS a distanza, ma **non sostituisce il
codice**: senza repo non affermare che una rotta, un componente o un campo esistono — verificali.
Il repository e' `l2v-hub/ClinicOS`, branch di lavoro `main`.
