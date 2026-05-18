<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Type: MINOR (2 new principles added, 2 existing principles materially expanded)

Modified principles:
  II. Healthcare UX → expanded: Italian UI, tablet-first, no tooltips as primary UX,
      unified ClinicalTable component rules, unified card design system
  IV. Schema & API Stability → expanded: no migrate reset, no db push --force-reset

Added principles:
  III. Backend Data Authority (new)
  VII. Environment Safety (new, renumbered from old VI)

Renumbered:
  old V. Integration Integrity → VI. Integration Integrity

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check now covers 7 principles
  ✅ .specify/templates/spec-template.md — no structural changes required
  ✅ .specify/templates/tasks-template.md — no structural changes required

Deferred TODOs: none
-->

# ClinicOS Constitution

## Core Principles

### I. Simplicity First

Code MUST remain simple and minimal. Components MUST be small and focused on a single
responsibility. No heavy UI frameworks (e.g. Material UI, Ant Design) may be introduced.
Abstractions MUST be justified by actual reuse — three similar lines are preferable to
a premature helper. YAGNI applies at all times; no features for hypothetical future needs.

**Rationale**: Healthcare software accrues complexity fast. Simplicity lowers bug surface,
speeds onboarding, and keeps the codebase maintainable as clinical requirements evolve.

### II. Healthcare UX

All major UI cards and widgets MUST be expandable. When a widget is expanded it MUST
become the central focus area. Clinical history and treatment history are primary views
and MUST be central on patient and clinical record pages. Other cards MAY be
compressed or collapsed when a primary view is active.

The UI language MUST be Italian. All labels, headings, button text, and user-facing
strings MUST be in Italian. The layout MUST be designed tablet-first (minimum target
1024px width). Tooltips MUST NOT be used as the primary UX pattern for conveying
required information; labels, inline text, or visible controls MUST be used instead.

All data tables MUST use the single shared `ClinicalTable` component. That component
MUST provide: a flat blue header row, per-column text filters, column sorting, and
row group compression/expansion. No table may be implemented outside this component.

All card-style widgets MUST follow the project's unified card design system: consistent
spacing, border radius, shadow, header style, and expand/collapse behavior. No ad-hoc
card styling is permitted.

**Rationale**: A consistent, Italian-language, tablet-optimized interface reduces
cognitive load for clinical staff. Unified table and card components prevent UI drift
and make the product feel professionally coherent.

### III. Backend Data Authority

The backend is the single source of truth for all clinical data. Clinical data MUST NOT
live exclusively in React local state or component state; any data that must persist or
be shared across sessions MUST be persisted via the backend API.

Every field of the patient record MUST be accessible and modifiable via a CRUD API
endpoint. No patient-facing data may exist that cannot be read, created, updated, or
deleted through the API.

Therapy administration records (erogata / non erogata) MUST be persisted in the backend.
They MUST NOT be stored only in local or session state.

The therapy agenda MUST display only real patients with real pharmacological therapies
that are active and valid for the selected date and time slot. Displaying placeholder,
mock, or hardcoded therapy data is prohibited in production code paths.

Mocks MUST NOT be used as the primary data source for any feature. Mocks are permitted
only in isolated unit test contexts where the backend cannot be reached.

**Rationale**: Clinical records are safety-critical. Data that exists only in local state
is lost on page reload and invisible to other users or systems. The backend authority
principle ensures data integrity across sessions, users, and deployments.

### IV. Schema & API Stability

The Prisma schema MUST NOT be changed unless the user explicitly requests it. The backend
API (Express routes, controllers, models) MUST NOT be changed unless explicitly requested.
The `/patients` API integration MUST remain functional at all times.

Destructive database commands are prohibited without explicit user approval:

- `prisma migrate reset` MUST NOT be run without explicit user approval.
- `prisma db push --force-reset` MUST NOT be run under any circumstances.

**Rationale**: Clinical data models and API contracts are high-risk change surfaces. Accidental
schema drift or destructive resets can corrupt patient data or break live integrations.

### V. Role-Aware Development

All features MUST be built with operator and manager role awareness. UI components MUST
respect the active role and hide or disable actions not permitted for that role.
Role-switching MUST NOT require a page reload.

**Rationale**: ClinicOS serves both frontline operators and managers with different access
levels. Role-awareness built into every feature prevents accidental privilege escalation.

### VI. Integration Integrity

No working integration MUST be removed or broken without explicit user approval.
TypeScript MUST compile cleanly (no `tsc` errors) after every change. Lint errors MUST
be resolved before any work is considered complete. Existing tests MUST remain green.

**Rationale**: Broken integrations in a healthcare app can disrupt patient care workflows.
The compile + lint gate enforces a minimum quality bar on every increment.

### VII. Environment Safety

When the application is deployed to Railway or Vercel, it MUST connect to the configured
remote PostgreSQL database. A local Podman database MUST NOT be used as the data source
for Railway or Vercel deployments. Environment variables MUST correctly point to the
target environment's database in each deployment context.

**Rationale**: Using a local database against a cloud deployment would silently serve
stale or empty data in production, making the application unreliable for clinical use.

## Technology Stack Constraints

- **Frontend**: React + TypeScript + Vite only. No framework switches without explicit approval.
- **Backend**: Node.js + Express + TypeScript only.
- **ORM**: Prisma 7 only. No raw SQL unless Prisma cannot express the query.
- **Database (local)**: PostgreSQL via Podman on `localhost:5432`.
- **Database (cloud)**: Remote PostgreSQL provided by Railway or Vercel deployment config.
- **Runtime**: Node.js ≥ 20, npm ≥ 10.
- **Monorepo layout**: `frontend/` and `backend/` workspaces at repository root.
- Backend runs on `http://localhost:3001`; frontend on `http://localhost:5173`.
- Frontend MUST call backend at `http://localhost:3001` (no proxy changes without approval).
- No `console.log` left in committed code unless explicitly requested.
- No temporary debug code may remain after a task is complete.

## Development Workflow

- Changes MUST target the smallest diff that satisfies the requirement.
- Unrelated files MUST NOT be modified in the same change.
- After every change: TypeScript MUST compile, lint MUST pass, existing functionality MUST work.
- UI changes require verifying the golden path in a browser before the task is reported done.
- If a previous fix failed, root cause MUST be explained before a new attempt is made.
- Only libraries already present in the project MAY be used; no new dependencies without approval.
- Mistakes corrected in a session MUST NOT be repeated in the same session.

## Governance

This constitution supersedes all other development practices for ClinicOS. Any amendment
requires the user's explicit approval and MUST update this file with an incremented version
and a new `Last Amended` date. The `CONSTITUTION_VERSION` follows semantic versioning:

- **MAJOR**: Backward-incompatible governance or principle removals / redefinitions.
- **MINOR**: New principle or section added or materially expanded.
- **PATCH**: Clarifications, wording fixes, non-semantic refinements.

All plan and spec documents MUST include a Constitution Check section that verifies
compliance with all seven core principles before implementation begins. Complexity
violations MUST be justified in the plan's Complexity Tracking table.

Runtime development guidance lives in `CLAUDE.md` at the project root.

**Version**: 1.1.0 | **Ratified**: 2026-05-18 | **Last Amended**: 2026-05-18
