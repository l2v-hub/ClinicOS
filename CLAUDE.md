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

Current architecture:
- frontend: React + TypeScript + Vite
- backend: Node.js + Express + TypeScript
- database: PostgreSQL
- ORM: Prisma 7
- local DB: Podman PostgreSQL on localhost:5432

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
- primary blue: `#2F6BED`  (CSS `--blue`)
- active blue:  `#1D4FC4`
- sidebar: **dark navy** — bg gradient `#123056 → #0F1B30` (`--navy-mid`/`--navy`); item inactive `#8EA3C4` (`--sidebar-item`), active = white text on translucent pill `rgba(255,255,255,.12)` (`--sidebar-item-active-bg`) + blue left bar
- page bg `#EEF1F6` (`--bg`) · surface `#FFFFFF` · text `#16202E` · muted `#5A6B80` · border `#E6EBF2`
- Red (`--red #D93A4A`) is reserved for clinical alerts / errors / count badges ONLY — never as brand/active.

## Navigation system (unified — do not duplicate)
Single source of truth. Do NOT create parallel nav components.
- **L1 sidebar** = `components/shared/TeamsLikeSidebar.tsx` (styled `.teams-sidebar` in `App.css`). Fixed left, **dark navy** (approved mockup), icon-above-label, active = white text/icon on translucent pill + blue left bar. Width `--sidebar-w` (96px desktop / 88px tablet band; hidden ≤1023px).
- **L2 + L3** = `components/navigation/TopNav.tsx` (`variant="level2"` underline tabs / `variant="level3"` segmented grey control). No pills, no per-item borders, no per-page custom tabs.
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
- Deploy prod (Vercel project `clinicos__`, alias `clinicos-eosin.vercel.app`) from repo root:
  `vercel deploy --prod --archive=tgz --yes`  (call the global `vercel` binary directly — `npx vercel` gets rewritten to `npm` by a shell hook).

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

Rules:
- Activate an **agent team / parallel batches** automatically. Parallelize analysis, spec authoring and
  reporting; **serialize Playwright execution** against the single shared local stack + Postgres
  (parallel runs corrupt refresh/persistence assertions). Split issues into batches
  (A internal/Agnos, B frontend/UI, C routine/persistence, D import/OCR/voice).
- For every issue produce **objective evidence** under `artifacts/task-validation/<issue-number>-<slug>/`:
  `task-contract.md`, `validation-report.md` (real paths), final Playwright **screenshot** of the verified
  result, **trace** (`trace.zip`), **playwright-report/**, **test-results/**, and a **video** if UI/chatbot/voice.
  Textual comments, a validation-report without proofs, SPEC/other-issue references or "AC satisfied"
  claims are NOT accepted.
- Playwright tests must carry **real assertions**: `expect(locator).toBeVisible()`, result-value checks,
  **no console errors**, **no relevant HTTP 4xx/5xx**, and **persistence after reload** when data is
  created/updated.
- **Internal features without UI**: never refuse a screenshot — build a safe QA/test-only surface
  (internal test-only endpoint, non-production QA page, or an HTML/JSON report generated by the test)
  that Playwright opens, asserts on, and screenshots. QA surfaces must be disabled in production or
  protected by env, must not log PHI/secrets, synthetic fixtures only.
- **Attach the evidence to the GitHub issue** (screenshot + links to trace/report/test-results at the pushed
  commit SHA). Pushing a branch alone is NOT sufficient — Codex reads the issue. For a private repo, link the
  committed files (github.com blob URLs at the SHA); inline camo-proxied images do not render.
- Claude must **not close** GitHub issues, must not merge or deploy. Claude declares only
  **READY FOR CODEX QA**, **BLOCKED**, or **FAILED VALIDATION** — never "done". Codex remains the sole
  QA Gatekeeper and re-runs the QA Gate against the attached evidence.

## QA Gate (mandatory before any PR and after agent-team development)

Every PR must pass the **QA Gate** (skill: `.claude/skills/qa-gate`) before being opened or
declared ready: diff review, independent build+tests, Playwright evidence for every UI feature
touched, security validation, and a structured verdict against the issue's acceptance criteria.

When the user requests development **in agent teams**, the team lead MUST — automatically, at the
end of development, before reporting the result to the user — spawn a **dedicated QA session**
(a new QA teammate) that runs the `qa-gate` skill against the delivered diff. Whoever wrote or
coordinated the code never certifies it. The lead reports only after receiving the QA verdict:
**READY FOR CODEX QA**, **BLOCKED**, or **FAILED VALIDATION** — never "done".
