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

- **L1 sidebar** = `components/shared/TeamsLikeSidebar.tsx` (styled `.teams-sidebar` in `App.css`). Fixed left, **dark navy** (approved mockup), icon-above-label, active = white text/icon on a **translucent pill only** (no blue left bar; removed for mockup parity), item radius 14. Width `--sidebar-w` (96px desktop / 88px tablet band). At **≤1023px** it becomes an **off-canvas drawer** (`transform:translateX`) toggled by a hamburger in `.compact-topbar`, with a `.mobile-nav-scrim`; `navigate()` in `App.tsx` closes it — do NOT revert to plain `display:none`.
- **L2 + L3** = `components/navigation/TopNav.tsx` (`variant="level2"` / `variant="level3"`). Both render **filled-blue pills** when active (active = `--blue` bg, white text; inactive muted) — this is the current mockup-parity state and **deviates from the old "underline L2 / segmented L3, no pills" contract** (user-approved). Styles in `components/navigation/TopNav.css`. No per-item borders, no per-page custom tabs.
- Named aliases exist (`AppSidebar`, `PageTopNavigation`, `PageSecondaryNavigation`) — thin wrappers over the above, zero duplicated logic.
- Diario uses the shared L3 (`TopNav level3`) like every other section — no custom Diario tabs.
- Design reference PNGs: `.claude/design-reference/*.png`; visual contract: `.claude/design-reference/CLINICOS_NAVIGATION_CONTRACT.md`. Copy structure/spacing/hierarchy only — never logos/brand/red.

## Layout

- `.app-shell` (flex) > fixed sidebar + `.main-area-clean` (`flex:1; width:100%; min-width:0`). Main content is full-width after the sidebar — no global `max-width` cap on the patient page.

## Hard constraints (unless explicitly asked)

- Do NOT change backend, Prisma schema, API routes, or `VITE_API_URL`.
- Prefer minimal, surgical changes. Do not redo the design system for a layout/styling fix.
- For surgical fixes, do NOT use Spec Kit.

## Build & deploy

- Before committing frontend work: `cd frontend && npm run build` must pass (`tsc -b && vite build`).
- **Frontend (Vercel) — MANUAL.** Deploy prod (project `clinicos__`, alias `clinicos-eosin.vercel.app`) from repo root:
  `vercel deploy --prod --archive=tgz --yes` (call the global `vercel` binary directly — `npx vercel` gets rewritten to `npm` by a shell hook). A `--prod` deploy auto-promotes the alias. **Pushing to `main` does NOT deploy the frontend** — only this command does. Cadence: run it when the user says "deploy" after a verified fix, never automatically.
- **Backend (Railway) — AUTO.** Deploys automatically via GitHub Actions (`.github/workflows/deploy-backend.yml`) on merge/push to `main` (backend URL `clinicos-backend-production-df88.up.railway.app`). Merging a backend PR triggers "Deploy Backend to Railway" + "AI Import E2E Gate" — watch with `gh run watch <id> --exit-status`. Don't try to deploy the backend by hand.
- **Prod is behind Entra/OIDC auth:** anonymous `curl` to the Vercel URL returns 403 — can't verify prod pages by curl. Verify with LOCAL Playwright + ask the user to hard-reload (Ctrl+Shift+R) authenticated. `frontend/vercel.json` SPA rewrite must stay `"/((?!assets/).*)"` (excludes `/assets/`) — a catch-all serves `index.html` for missing hashed chunks → "MIME type text/html" errors. Don't re-broaden it.

<!-- SPECKIT START -->

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
