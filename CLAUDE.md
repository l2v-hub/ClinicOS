# ClinicOS Claude Instructions

## Quality Gate / Agent Loop (OBBLIGATORIO — precede tutto)

Ogni richiesta di sviluppo, bugfix, refactoring, frontend, backend, Agnos AI, voice, OCR, database
o configurazione deve seguire questo loop:

```
Task request → Task Contract → Impact Classification → Acceptance Criteria → Test Plan
→ Implementation → Runtime Validation → Evidence → Final Decision
```

**Regole dure:**

- Claude non può modificare codice applicativo finché non esiste:
  `artifacts/task-validation/<task-slug>/task-contract.md` (valido).
  Crealo con: `node scripts/quality-gate/create-task-contract.js "<titolo>"`.
- Claude non può dichiarare "done", "fixed", "completato", "risolto", "chiuso" o simili finché non esiste:
  `artifacts/task-validation/<task-slug>/validation-report.md` con `Final Decision: CLOSED — VERIFIED`.
- In assenza di validazione, lo stato deve essere uno tra:
  `IMPLEMENTED — NOT VERIFIED` · `FAILED VALIDATION` · `BLOCKED` · `PARTIAL` — **mai** "done".
- La decisione finale deriva dai test eseguiti.

Skill: `.claude/skills/agent-loop-quality-gate`. Enforcement: hook
`.claude/hooks/quality-gate-preflight.js` (blocca modifiche senza contract) e
`.claude/hooks/quality-gate-closure.js` (blocca "done" senza report verificato). Dettagli e limiti:
`docs/quality-gate.md`. Complementare a `docs/validation-method.md`.

---

ClinicOS is a full-stack healthcare management app.

Current backend:

- http://localhost:3001/health
- http://localhost:3001/patients

Current frontend:

- http://localhost:5173
- must call backend at http://localhost:3001

Design goal:
Use the Stitch healthcare mockup as visual reference.
Create a professional enterprise healthcare UI:

- sidebar navigation
- header
- operator/manager role awareness
- dashboard cards
- patient table
- patient detail layout
- clinical history central and expandable
- agenda with 30-minute slots
- manager multi-operator agenda

Important UX rule:
All major cards/widgets must be expandable.
When a widget is expanded, it becomes the central focus area.
Clinical history and treatment history are primary and must be central on patient/clinical record pages.
Other cards can be compressed/collapsed.

Development rules:

- Keep code simple.
- Prefer small components.
- Do not change backend unless explicitly asked.
- Do not change Prisma schema unless explicitly asked.
- Do not remove working /patients integration.
- Do not use heavy UI frameworks.

## Brand palette (medical blue — no red as primary)

Source of truth: approved mockup `mockup/design-mockup.html` (token-driven via `:root` in `App.css`).

- primary blue: `#2F6BED` (CSS `--blue`)
- active blue: `#1D4FC4`
- sidebar: **dark navy** — bg gradient `#123056 → #0F1B30` (`--navy-mid`/`--navy`); item inactive `#8EA3C4` (`--sidebar-item`), active = white text on translucent pill `rgba(255,255,255,.12)` (`--sidebar-item-active-bg`) + blue left bar
- page bg `#EEF1F6` (`--bg`) · surface `#FFFFFF` · text `#16202E` · muted `#5A6B80` · border `#E6EBF2`
- Red (`--red #D93A4A`) is reserved for clinical alerts / errors / count badges ONLY — never as brand/active.

## Navigation system (unified — do not duplicate)

Single source of truth. Do NOT create parallel nav components.

- **L1 sidebar** = `components/shared/TeamsLikeSidebar.tsx` (styled `.teams-sidebar` in `App.css`). Fixed left, **dark navy** (approved mockup), icon-above-label, active = white text/icon on a **translucent pill only** (no blue left bar; removed for mockup parity), item radius 14. Width `--sidebar-w` 96px (no narrower tablet band), items 80×64, logo 48, operator order = HMI 1 prototype (Turno, Pazienti, Terapia, Parametri, Consegne, Agenda, Note, Farmaci; Assistente pinned at the bottom). Header `.compact-topbar` is 72px: back (48, icon only) + page title slot (`PageHeader` portals title/subtitle there via `TopbarTitleSlot`) + turno/ora + search (48) + reparto + avatar menu (Esci). HMI 1 prototype screenshots: `artifacts/hmi-parity/proto/*.png`. At **≤1023px** it becomes an **off-canvas drawer** (`transform:translateX`) toggled by a hamburger in `.compact-topbar`, with a `.mobile-nav-scrim`; `navigate()` in `App.tsx` closes it — do NOT revert to plain `display:none`.
- **L2 + L3** = `components/navigation/TopNav.tsx` (`variant="level2"` / `variant="level3"`). L2 items look like the canonical chips (active = blue-tint background, blue border, `--ds-blue-active` text); L3 is flat, underlined tabs, visibly subordinate to L2 (active = blue text + 3px blue underline). Same control height as every other control (`--ds-control-h`). Styles in `components/navigation/TopNav.css` + `design-system.css`/`compact-layout.css`; tests lock both looks (`lib/__tests__/patientDetailWorkspace.test.ts`). No per-item borders, no per-page custom tabs.
- Named aliases exist (`AppSidebar`, `PageTopNavigation`, `PageSecondaryNavigation`) — thin wrappers over the above, zero duplicated logic.
- **Patient chart = ONE level (HMI 1, 2026-09-27).** `PatientDetail` renders a single `TopNav` (`variant="level2"` + `top-nav--section-grid`; wraps on tablet/desktop with no horizontal scroll, a single row scrolling inside the rail at ≤600px) listing every chart tab (Anagrafica … Dimissione) with visual-only group captions (`groupLabel`/`groupStart` on `TopNavItem`: "Ingresso", "Clinica"). No L3 inside the chart; `TAB_GROUPS` stays the data source (labels, badges, deep links). Moduli is one entry (catalog) and scales open from it. The Diario author filter is a content filter (chips), not navigation. L3 (`variant="level3"`) remains for page-internal sub-navigation elsewhere (e.g. Terapia Farmacologica).
- Design reference PNGs: `.claude/design-reference/*.png`; visual contract: `.claude/design-reference/CLINICOS_NAVIGATION_CONTRACT.md`. Copy structure/spacing/hierarchy only — never logos/brand/red.

## Layout

- `.app-shell` (flex) > fixed sidebar + `.main-area-clean` (`flex:1; width:100%; min-width:0`). Main content is full-width after the sidebar — no global `max-width` cap on the patient page.

## Hard constraints (unless explicitly asked)

- Do NOT change backend, Prisma schema, API routes, or `VITE_API_URL`.
- Prefer minimal, surgical changes. Do not redo the design system for a layout/styling fix.
- For surgical fixes, do NOT use Spec Kit.

## Build & deploy

- Before committing frontend work: `cd frontend && npm run build` must pass (`tsc -b && vite build`).
- **The live site is the isolated development environment** — `https://clinicos-development-isolated.vercel.app`
  (synthetic data, five simulated profiles). The previous demo (`clinicos-eosin.vercel.app`,
  backend `clinicos-backend-production-df88.up.railway.app`) is **retired**: do not deploy to it
  and do not give its URL to the user.
  - Frontend: Vercel project `clinicos-development-isolated`.
  - API: `https://development-backend-development-a4a4.up.railway.app` (dedicated Railway project,
    single environment `development`); `frontend/vercel.json` allows only this backend in `connect-src`.
  - Procedure, target IDs and rules: `docs/operations/development-release.md`. Read it before any release.
- **Nothing deploys automatically.** Pushing or merging to `main` does NOT update the site. The old
  workflows (`deploy-backend.yml`, `deploy-runtime.yml`, `deploy-demo-exact-commit.yml`, demo auth)
  targeted the retired demo and are disabled on GitHub on purpose: never re-enable or run them.
- A release is a specific operation run by the operator with their own Railway/Vercel
  authorization (runtime if needed, then backend, then frontend). A cloud session has neither the
  credentials nor network access to those hosts: prepare the source, say plainly that the release
  is still to be done, and never report a change as online without evidence from the site itself.
- On the development environment do not run seed, manual SQL or implicit deletions: its test
  fixtures are preserved synthetic records. `POST /admin/synthetic-data/wipe` deletes them — only
  on an explicit request from the user.
- After a release the browser may serve the old bundle: ask the user for a hard reload
  (Ctrl+Shift+R). `frontend/vercel.json` SPA rewrite must stay `"/((?!assets/).*)"` (excludes
  `/assets/`) — a catch-all serves `index.html` for missing hashed chunks → "MIME type text/html"
  errors. Don't re-broaden it.

## Dati sintetici e bozze d'ingresso

- **Dati di prova**: `POST /admin/synthetic-data/seed` popola un dataset sintetico completo,
  `POST /admin/synthetic-data/wipe` (body `{"confirm":"CANCELLA TUTTO"}`) svuota i dati operativi,
  `GET /admin/synthetic-data` dà stato e conteggi. Solo amministratore, e solo dove l'ambiente è
  dichiarato esplicitamente di prova (chiuso per default: `NODE_ENV` assente o errato = disabilitato).
  Dettagli: `docs/synthetic-data-api.md`; codice: `backend/src/synthetic/`. Una nuova tabella Prisma
  va dichiarata in `WIPED_TABLES` o `PRESERVED_TABLES` (`synthetic/wipe.ts`), altrimenti un test fallisce.
- **Una voce in bozza per paziente**: `GET /intake/drafts` segnala i doppioni con `duplicateOfId`
  (identità forte: CF valido oppure cognome+nome+data di nascita — `backend/src/intake/draft-identity.ts`);
  l'elenco li raggruppa (`frontend/src/components/shared/intake/draftList.ts`). «Elimina bozza» =
  `PATCH /intake/drafts/:id` con il solo corpo `{"status":"abandoned"}` (archivia, non cancella).
  Mai fondere automaticamente i dati di due bozze, mai archiviarne una senza un gesto esplicito
  dell'operatore (nemmeno alla conferma del paziente), mai riusare lato server una bozza fra schede.
- **La bozza resta una sola finché l'ingresso non si conclude**: la sessione documenti collegata
  a una bozza aperta non scade (`expirePageSessions` in `backend/src/ai/upload/pages/cleanup.ts`);
  i documenti seguono la bozza e spariscono alla conferma o con «Elimina bozza». «Riprendi bozza»
  riapre sempre la stessa bozza con le ultime modifiche. Se una bozza è rimasta senza documenti
  (dati precedenti o sessione eliminata a mano), la nuova importazione la **sostituisce** con un
  gesto esplicito, non le si affianca.

## Coerenza grafica (regole canoniche — non reinventare per pagina)

- Titolo di pagina **sempre** nella topbar con `PageHeader` (`title`/`subtitle`/`actions`): niente
  `view-header` o titoli nel contenuto.
- I controlli hanno una sola altezza su ogni pagina e nella topbar (`--ds-control-h: 44px` su
  `:root`; solo la stampa ha la sua): nessuna pagina ridefinisce il token.
- Spaziature di pagina: rientro 24px (`.page-content`), 16px fra i blocchi (`--ds-layout-gap`), 16px
  dentro le card (`--ds-card-padding`). La pagina è una pila verticale con `gap`: i blocchi non
  portano margini verticali propri. Una pagina nuova si aggiunge all'elenco «Ritmo di pagina» di
  `design-system.css`; dettagli in `frontend/src/design-system/README.md`.
- Le card di pagina usano `--ds-card-radius` e nessuna ombra a riposo (mai
  toccare il bordo o le ombre di stato: stria di priorità, alone di fuoco); `h1/h2`
  = 18px/600 e `h3` ha una base comune (`compact-layout.css`). Le regole stanno in
  `frontend/src/design-system.css` («Coerenza di pagina») e `compact-layout.css`: una nuova card di
  pagina si aggiunge a quell'elenco, non a un CSS di pagina.
- Contenuto a tutta larghezza dopo la sidebar: nessun `max-width` per pagina.

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/016-agnos-llm-reads/plan.md`.
<!-- SPECKIT END -->

## ClinicOS Requirements Queue

When asked to process requirements, Claude must use:

.claude/workflows/REQUIREMENTS_QUEUE.md

GitHub Issues with label `clinicos-requirement` are the source of truth.

Rules:

- open issue = requirement to process
- closed issue = completed and tested
- blocked issue = add `status-blocked`, comment reason, do not close
- process one issue at a time
- run tests required by the issue
- always run `npm run build`
- close the issue only after acceptance criteria and tests pass

## Mandatory Requirement Deployment Rule

A ClinicOS requirement is not finished when the code builds.

A requirement is finished only when:

- acceptance criteria are satisfied;
- required tests pass;
- `npm run build` passes;
- code is committed;
- code is pushed;
- deployment has started.

Claude must not close a GitHub Issue with label `clinicos-requirement` until the push succeeds and the deployment is triggered.

Final required commands:

git status
git add .
git commit -m "REQ-XXX implement <short title>"
git push origin HEAD

If deployment does not start, keep the issue open, add `status-deploy-failed`, and comment the reason.

## REQ Traceability

Every ClinicOS requirement must be traceable from requirement to deployment.

Required trace:

GitHub Issue -> commit message -> push -> deployment manifest -> deployment.

Rules:

- commit messages must start with `REQ-XXX:`
- every completed REQ must be included in a deployment manifest under `requirements/deployments/`
- every deployment manifest must list all REQs included in that deploy
- GitHub Issues must not be closed without commit hash, build result and deployment manifest path
- if several REQs are deployed together, all REQs must be listed in the same deploy manifest

## Parallel Evidence Remediation

When Codex marks issues `QA FAILED — MISSING OBJECTIVE EVIDENCE` (or labels them
`qa-failed` / `needs-evidence` / `playwright-required`, or an issue cannot be closed for
lack of objective evidence), Claude MUST automatically enter **Parallel Evidence Remediation**
(skill: `.claude/skills/parallel-evidence-remediation`; docs: `docs/parallel-evidence-remediation.md`).
The reference request "Produci evidenze oggettive per le issue marcate da Codex come
QA FAILED — MISSING OBJECTIVE EVIDENCE" starts this mode directly, without waiting for further instructions.

Le regole operative (batch paralleli, evidenze obbligatorie per issue, assertion Playwright reali,
superfici QA per le feature senza UI, allegato all'issue) vivono nella skill, che le carica quando
serve. Vincolo che resta qui perché è un divieto: Claude non chiude issue, non merga e non deploya
di sua iniziativa in questa modalità — dichiara solo **READY FOR QA**, **BLOCKED** o
**FAILED VALIDATION**, mai "done".

## QA Gate (mandatory before any PR and after agent-team development)

Every PR must pass the **QA Gate** (skill: `.claude/skills/qa-gate`) before being opened or
declared ready: diff review, independent build+tests, Playwright evidence for every UI feature
touched, security validation, and a structured verdict against the issue's acceptance criteria.

Sviluppo **in agent team**: il lead deve far certificare il diff da una sessione QA dedicata prima
di riportare il risultato — chi ha scritto o coordinato il codice non lo certifica mai. Verdetti
ammessi: **READY FOR QA**, **BLOCKED**, **FAILED VALIDATION** — mai "done". Il dettaglio della
procedura sta nella skill `qa-gate`.

## Agent skills

### Issue tracker

Codex and Claude share GitHub Issues in `l2v-hub/ClinicOS`.
Read `docs/agents/issue-tracker.md` before using issue/spec/ticket skills.

### Triage labels

Matt Pocock's label integration is deferred by the user. Read
`docs/agents/triage-labels.md`; installation alone must not change GitHub labels.

### Domain docs

Use the shared single-context glossary/ADR conventions in `docs/agents/domain.md`.

### Installed Codex skills

The 27 supported Matt Pocock skills v1.3.1 are installed as project Agent Skills
under `.agents/skills/`, pinned with hashes and MIT attribution in
`docs/agents/matt-pocock-skills.json`. They are editable copies with manual
updates, not an auto-updating global plugin. Open Codex in this repository;
a fresh session may be needed to reload the skill catalog. Preserve each
skill's explicit-invocation metadata. Claude's existing plugin is not changed;
both agents should read the same `docs/agents/` configuration.

These skills complement the ClinicOS task contract, validation, exact-SHA peer
review and deployed-resolution evidence gates above. A generic skill must not
close a clinical issue on a local test, bypass ownership, or erase attempt history.
