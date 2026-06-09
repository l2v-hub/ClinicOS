# ClinicOS Claude Instructions

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
- primary blue: `#0F5FD7`  (CSS `--blue` / `--c-primary`)
- active blue:  `#004FC4`  (`--c-primary-active`)
- sidebar bg:   `#E9EDF2`  · active item bg: `#FFFFFF`
- text `#101828` · muted `#667085` · border `#D0D5DD`
- Red (`--red #DC2626`) is reserved for clinical alerts / errors / count badges ONLY — never as brand/active.

## Navigation system (unified — do not duplicate)
Single source of truth. Do NOT create parallel nav components.
- **L1 sidebar** = `components/shared/TeamsLikeSidebar.tsx` (styled `.teams-sidebar` in `App.css`). Fixed left, light grey, icon-above-label, active = white card + blue left bar. Width `--sidebar-w` (96px desktop / 88px tablet band; hidden ≤1023px).
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
at `specs/014-redesign-design-system/plan.md`.
<!-- SPECKIT END -->
