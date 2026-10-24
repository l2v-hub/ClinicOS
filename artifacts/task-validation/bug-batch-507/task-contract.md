# Task Contract

## Task
- Title: bug-batch-507 — therapy admission-date defaults
- Type: bugfix
- Date: 2026-10-24
- Issue: #507 only
- Baseline: 715a4b9e47ff9bd0192b7f58f24271e48da4900d
- Branch/worktree: codex/bug-batch-507, /workspace/clinicos-bug-507
- Durable reservation: round 1, ff31e026-6aa9-46c1-9ea2-c64f6d8a48cd; canonical state commit 11e3d16a6058c0e39c313b710a37eba27c68caef (coordinator owned).

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | yes |
| Backend/API | no |
| Database/Persistence | no |
| Agnos AI / Chatbot | no |
| Voice | no |
| OCR / Import | no |
| Auth / Permissions | no |
| Privacy / Security | no |
| Config / Env | no |

## Current Behaviour

Source inspection shows new manual therapy forms use the current Europe/Rome day even when an admission date exists. Chart creation ignores resolved cartella.presaInCarico.dataIngresso (legacy dataPresa supported); intake manual additions ignore ingresso.dataPresa. No screenshot examined or browser reproduction claimed yet.

## Expected Behaviour

New manual forms initialize start and one-time administration dates from the admission calendar day. Chart uses resolved cartella.presaInCarico.dataIngresso (legacy dataPresa supported); intake uses ingresso.dataPresa. Only new-form creation applies defaults. Explicit saved/imported dates, calendar slots and operator edits retain their values. Missing/invalid admission falls back to the existing current Europe/Rome day. Calendar dates undergo no timezone conversion.

## Acceptance Criteria

- AC1: Opening/reopening chart manual creation initializes both dates to the current patient's valid admission day, for periodica, al_bisogno and una_tantum.
- AC2: New manual intake rows initialize to ingresso.dataPresa; existing manual/imported rows and operator edits remain unchanged when admission context changes.
- AC3: Explicit saved and calendar-slot dates retain precedence, including submission payload dates.
- AC4: Missing, malformed/impossible admission uses current Europe/Rome day; valid leap/DST dates retain their exact day regardless of device timezone.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Default normalization, invalid/leap/DST cases, changes, mapping and slot precedence |
| Integration | no | Frontend state defaults only |
| API | no | Unchanged contracts |
| Playwright | yes | Actual components: chart/intake create/edit/reopen; independent coordinator QA |
| Persistence after refresh | no | No persistence change; payload preservation checked, actual backend persistence not claimed |
| Agnos action registry | no | Unaffected |
| Voice simulation | no | Unaffected |
| OCR/import test | yes | Existing imported explicit-date mapper regression |
| Security/privacy scan | yes | Diff/evidence review; synthetic only, no external endpoints |
| Build | yes | Required frontend TypeScript/Vite build |

## Evidence Plan

Sanitized test/build outputs, source manifest and report in this packet. Browser screenshots/traces of actual components are distinguished from authenticated backend E2E. Coordinator runs separate independent QA; author does not certify closure. No real patient data, existing env files, database, Railway or remote backend access.

## Scope and Risks

Allowlist: therapy form factory/default helper, chart creation callsites and PatientDetail admission prop wiring, intake admission prop wiring and related tests/harness. Backend, API, schema, providers, dependencies, environment and automation excluded. No reactive defaulting effect, to preserve operator edits. Calendar slots retain precedence. No extra clinical rules inferred. Issue #506 has a separate worktree and owner. Direct bounded assignment from coordinator; no further delegation needed.

## Gate Status

READY FOR IMPLEMENTATION


## Round 2 amendment — F507-1 (2026-10-24)

Independent QA round 1 returned FAILED VALIDATION: cold actual PatientDetail hydration supplies admission after a new form has initialized its fallback dates. Both untouched automatic dates incorrectly remain today. Original one-time-only wording and the blanket prohibition on reactive defaulting above are superseded narrowly by this amendment; explicit/operator dates must still never be overwritten.

- Durable round 2 reservation: b3c7d563-d85e-4371-bf2e-c1d6a92cbe4d; canonical state ad6a3cee92ed9b412c41e311b4c582ca4dfc3e62 (coordinator owned). Round 1 remains consumed/failed. No resets.
- AC1b: A valid admission arriving asynchronously updates still-automatic fallback date fields of a new manual chart/intake form. Each date tracks operator input independently; editing either field, including selecting the same fallback day, protects that field while the other can hydrate.
- AC3b: Hydration never modifies saved/imported rows, explicit calendar-slot dates, or a draft associated with another patient. Automatic lineage ends after successful hydration; subsequent context changes do not rewrite prescriptions.
- Implementation scope remains frontend therapy defaults/state, per-field date-input notification, and bounded tests. No backend/API/schema/provider/dependency/env/automation changes.
- Required regressions: actual PatientDetail host late admission with untouched fields; pre-arrival start-only and once-only edits; explicit same-fallback input; saved/calendar/imported preservation; patient remount; Rome/Los Angeles. New manual intake lineage is session-local and never attached to imported/persisted row payloads.
- Evidence: original QA report and all original author evidence remain unchanged. New round2 outputs and report live under round2/. Coordinator opens a separate QA2 after handoff.

READY FOR IMPLEMENTATION
