# Validation Report — Issue #245 remediation (legacy anamnesi read-only view)

Slug: `245-remove-duplicate-anamnesis` · Branch: `fix/issue-245-anamnesi` · Worktree:
`E:/Workspace/DG_SE_DEV/ClinicOS/.wt-fix/245` · Date: 2026-07-10.

## What changed

- `frontend/src/lib/legacyAnamnesis.ts` (new) — pure helpers `hasLegacyAnamnesis(anamnesi)` and
  `legacyAnamnesisRows(anamnesi)` over the `Anamnesi` type.
- `frontend/src/components/operator/sections/LegacyAnamnesisView.tsx` (new) — read-only panel,
  renders `null` when `hasLegacyAnamnesis` is false; otherwise a `ClinicalTableSection` titled
  "Anamnesi (dati strutturati — sola lettura)" with `data-testid="legacy-anamnesis"`, one
  label/value row per populated field, an "Aggiornato" line, and the operator-guidance note.
- `frontend/src/components/operator/PatientDetail.tsx` — mounts
  `<LegacyAnamnesisView anamnesi={cartella.anamnesi} />` above `<NarrativeSectionsTab />` in the
  `sezioni-narrative` tab branch (no other branches touched; the removed `'anamnesi'` tab stays
  removed).
- `frontend/src/app-additions.css` — `.cr-legacy-anamnesi-row*` / `.cr-legacy-anamnesi-note`
  rules, matching the existing `cr-anamnesi-card__*` visual pattern (label uppercase/muted,
  value `white-space: pre-wrap`).
- `frontend/src/lib/__tests__/legacyAnamnesis.test.ts` (new) — 6 `node:test` cases.
- `e2e/remediation/issue-245.spec.ts` + `e2e/remediation/pw.config.245.ts` (new) — Playwright
  spec authored per the shared remediation contract; **not executed here** (no local stack in
  this worktree) — spec parse verified with `--list`; execution + real evidence collection is
  done by the controller against the shared local stack.

## Test evidence executed here

| Test | Command | Result |
|---|---|---|
| Pure-logic unit tests | `node_modules/.bin/tsx --test frontend/src/lib/__tests__/legacyAnamnesis.test.ts` | **6/6 PASS** (0 fail) |
| TypeScript build gate | `cd frontend && npx tsc -b` | **0 errors** |
| Full frontend build | `npm run build:frontend` (`tsc -b && vite build`) | **PASS** — built in 12.22s, no new warnings besides pre-existing chunk-size notice |
| Playwright spec parses | `node_modules/.bin/playwright test --config e2e/remediation/pw.config.245.ts --list` | **PASS** — 1 test discovered (`issue-245.spec.ts:62`), no parse errors |
| Playwright spec execution (real browser, seeded value, reload) | *(pending — controller runs against shared local stack + Postgres)* | NOT YET RUN HERE |

## AC → esito → evidence path

| AC | Esito | Evidence |
|---|---|---|
| AC1 — no duplicate "Anamnesi" tab (dedup persists) | Code-verified: `PatientDetail.tsx` still has no `'anamnesi'` TabId/tab entry/render branch (unchanged from PR #252) · Playwright-asserted (pending real run) in `e2e/remediation/issue-245.spec.ts` line ~90 |
| AC2 — pre-existing `Cartella.data.anamnesi` reachable by the operator (the exact Codex gap) | Implemented via `LegacyAnamnesisView` + `hasLegacyAnamnesis`/`legacyAnamnesisRows` (unit-tested, 6/6 PASS, see `frontend/src/lib/__tests__/legacyAnamnesis.test.ts`) · Playwright will assert `[data-testid="legacy-anamnesis"]` visible + contains seeded value `"Ipertensione arteriosa (sintetico)"` — pending real run against `SEED-PAZ-008` |
| AC3 — single unambiguous anamnesi destination | "Sezioni Cliniche (testo)" now hosts both narrative sections and, when populated, the legacy view — no other anamnesi entry point exists |
| AC4 — data preservation survives reload (new, Codex-required) | Spec reloads and re-navigates, re-asserting the seeded value — pending real run; this is precisely the "test a seeded existing record through the UI" proof Codex required and the prior report lacked |
| AC5 — no dead panel when no legacy data | `hasLegacyAnamnesis({})` → `false`, `legacyAnamnesisRows({})` → `[]` — **PASS**, unit test `legacyAnamnesis.test.ts` |

## Prova di preservazione dati (data-preservation proof)

Design-level proof (verified here): `LegacyAnamnesisView` reads `cartella.anamnesi` — the exact
same object the removed `AnamnesisEditor` read/wrote via `PUT /patients/:id/cartella` — through
no new endpoint or transformation. No migration, no field renaming, no data copy: the legacy
object is rendered in place, so any value already stored is guaranteed reachable the moment the
component mounts.

Runtime proof (authored, pending controller execution): `e2e/remediation/issue-245.spec.ts`
`beforeAll` does `GET /patients/SEED-PAZ-008/cartella` → merges a synthetic
`patologicaRemota: "Ipertensione arteriosa (sintetico)"` into the existing `anamnesi` object →
`PUT` it back (read-modify-write, no data loss for other fields) → the test then opens
Moretti, Elena → Clinica → "Sezioni Cliniche (testo)" and asserts the seeded string is visible →
reloads the whole app → re-asserts the seeded string is still visible → `afterAll` restores the
original `cartella.data` (best-effort). This is the objective, reload-surviving proof Codex
required ("migrate/map legacy anamnesis or provide a read-only legacy view, then test a seeded
existing record through the UI").

## CI disposition

Per the shared remediation brief: Azure SWA deploy is a known repo-wide infra failure (baseline
noise across all current remediation batches), unrelated to this change. No CI config was
touched by this remediation.

## Concerns / follow-ups for the controller

- The Playwright spec was authored and parse-verified (`--list` succeeds) but **not executed**
  in this worktree — there is no local stack (backend :3001 / Postgres / frontend :5173) running
  here. The controller must run it serially against the shared stack and attach the resulting
  `screenshots/result.png`, `trace.zip`, `playwright-report/`, `test-results/`, and video to the
  GitHub issue per the Parallel Evidence Remediation rules.
- `SEED-PAZ-008` (Elena Moretti) was confirmed as a real seeded patient id via
  `backend/src/seed.ts:179` and prior evidence files (`requirements/evidence/REQ-039/`,
  `requirements/evidence/REQ-040/`, `requirements/evidence/SPEC-015/perf-*.json`).

La stringa "CLOSED — VERIFIED" viene apposta da Codex dopo verifica indipendente, come da
handoff #239.

Final Decision: READY FOR CODEX QA
