# Task Contract — Issue #245 remediation (QA FAILED → legacy anamnesi read-only view)

## Task
- Title: Restore accessibility of pre-existing structured anamnesi after duplicate-tab removal
- Slug: 245-remove-duplicate-anamnesis
- Type: bugfix (QA remediation)
- Date: 2026-07-10
- Issue: GitHub #245 · PR #252 (branch `fix/issue-245-anamnesi`)
- Superseded evidence dir (kept, not canonical): `artifacts/task-validation/245-anamnesi-dedup/`

## Codex QA FAILED finding (verbatim)

> The PR removes the only post-intake UI for `Cartella.data.anamnesi` without migrating or
> displaying those existing values … Data remains in storage but becomes inaccessible to the
> operator; this does not satisfy AC2.
> Required: migrate/map legacy anamnesis or provide a read-only legacy view, then test a seeded
> existing record through the UI. Also missing test-results/ + data-preservation proof.

## Current Behaviour (concrete, before this remediation)

- PR #252 (commit `cee0015`) removed the `AnamnesisEditor` import, the `'anamnesi'` `TabId`,
  its L3 tab entry, and its render branch from
  `frontend/src/components/operator/PatientDetail.tsx`.
- `Cartella.data.anamnesi` (`Anamnesi` type: `fisiologica`, `patologicaRemota`,
  `patologicaProssima`, `familiare`, `lavorativa`, `abitudini`, `note`, `updatedAt`, `operatore`)
  is still returned by `GET /patients/:id/cartella` and still writable via
  `PUT /patients/:id/cartella`, but after the PR **no UI surface reads it** — patients intaken
  before the change (with a populated `Cartella.data.anamnesi`) have that data silently
  invisible to operators. The remaining "Sezioni Cliniche (testo)" tab
  (`NarrativeSectionsTab`) reads a *different* store (`PatientNarrativeSection` rows keyed by
  `sectionKey`), not `Cartella.data.anamnesi` — the two never shared data.
- The prior validation report (`245-anamnesi-dedup/validation-report.md`) asserted AC2 by
  argument ("nav-only removal cannot lose data") without ever rendering the legacy value through
  the UI — Codex correctly rejected this as unproven.

## Expected Behaviour (after this remediation)

- The duplicate editable "Anamnesi" L3 tab remains removed (dedup stands — no regression on
  AC1/AC3 of the original issue).
- When `Cartella.data.anamnesi` has at least one populated field, a new read-only
  `LegacyAnamnesisView` panel — titled "Anamnesi (dati strutturati — sola lettura)",
  `data-testid="legacy-anamnesis"` — renders above `NarrativeSectionsTab` inside the
  "Sezioni Cliniche (testo)" tab, showing each populated field as a label/value row plus a note
  directing operators to the narrative sections for updates.
- When `Cartella.data.anamnesi` has no populated field (new-style patients intaken after the
  narrative-sections migration), the panel renders nothing — no dead/empty UI.
- The seeded legacy value survives a full page reload (it lives in `Cartella` storage, not
  component state).

## Acceptance Criteria

- AC1 — No duplicate "Anamnesi" tab in the "Clinica" L3 tab group (dedup persists).
  Asserted: Playwright `e2e/remediation/issue-245.spec.ts` — collects all `button, [role="tab"]`
  labels in the Clinica group and asserts none equals `"Anamnesi"`.
- AC2 — Pre-existing `Cartella.data.anamnesi` values are reachable by the operator (the actual
  gap Codex flagged). Asserted: same spec seeds a synthetic value
  (`patologicaRemota: "Ipertensione arteriosa (sintetico)"`) via a real
  `PUT /patients/SEED-PAZ-008/cartella` read-modify-write, then asserts
  `[data-testid="legacy-anamnesis"]` is visible and contains that exact string under
  "Sezioni Cliniche (testo)".
- AC3 — Single, unambiguous anamnesi destination in navigation ("Sezioni Cliniche (testo)" now
  hosts both the narrative sections and, when present, the legacy structured view). Asserted:
  same spec asserts a "Sezioni Cliniche" label exists in the L3 tab group.
- AC4 (new, this remediation) — Data preservation survives reload. Asserted: spec reloads the
  app and re-navigates to the same tab, re-asserting the seeded value is still visible.
- AC5 (new, this remediation) — No dead panel for patients without legacy data. Asserted:
  `frontend/src/lib/__tests__/legacyAnamnesis.test.ts` — `hasLegacyAnamnesis({})` → `false`,
  `legacyAnamnesisRows({})` → `[]`.

## Impact table

| Area | Impacted | Note |
|---|---:|---|
| Frontend | yes | New component `LegacyAnamnesisView.tsx` + pure lib `legacyAnamnesis.ts`; mounted in `PatientDetail.tsx`; CSS additions in `app-additions.css`. |
| Backend | no | No route/schema change — reuses existing `GET/PUT /patients/:id/cartella`. |
| DB / Prisma | no | No schema/migration change. `Cartella.data` JSON shape unchanged. |
| API | no | No new/changed endpoints. |
| Privacy | no | Read-only rendering of already-authorized clinical data already visible to the same operator role before the original PR; no new data exposure surface, no logging added. |

## Test Plan

| Test | Reason |
|---|---|
| `frontend/src/lib/__tests__/legacyAnamnesis.test.ts` (node:test via `tsx --test`) | Pure-logic proof that the panel never renders for empty legacy data (AC5) and correctly maps populated fields in canonical order (supports AC2 rendering logic). |
| `frontend/src/tsc -b` (`npm run build:frontend`) | Guards against TypeScript regressions from the new component/import wiring. |
| `e2e/remediation/issue-245.spec.ts` (Playwright, executed later by controller against the live stack) | Only way to prove AC2/AC4 objectively: seeds a real legacy value via the API, drives the actual UI, asserts visibility + reload persistence — closes the exact gap Codex flagged ("test a seeded existing record through the UI"). |

## Risks

- The `LegacyAnamnesisView` duplicates field labels already known to `AnamnesisEditor`
  (`SECTIONS` array) — kept as a separate, smaller, read-only mapping rather than importing the
  editor to avoid pulling in its edit-mode state/handlers for a read-only surface. Risk: label
  text can drift between the two if either is edited later; low likelihood/impact (both are
  small, static arrays).
- `familiare`/`lavorativa` fields were removed from the *intake* form per BUG-054 (#92) but the
  `Anamnesi` type still carries them; the legacy view intentionally still surfaces them if a
  pre-#92 record has them populated, so no historical data is ever hidden.
- CI: Azure SWA deploy check is a known repo-wide infra failure unrelated to this change
  (baseline noise per prior remediation batches) — not a regression introduced here.

## QA surface chosen

Read-only legacy view mounted in the existing "Sezioni Cliniche (testo)" tab
(`PatientDetail.tsx`, `sezioni-narrative` branch) — no new route/page; reuses the exact
navigation path an operator already uses today, satisfying Codex's "read-only legacy view"
remediation option (lower risk than a data migration into `PatientNarrativeSection`).

## Gate Status

READY FOR IMPLEMENTATION → IMPLEMENTED (see validation-report.md)
