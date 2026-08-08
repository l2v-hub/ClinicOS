# Task Validation Report

## Task
- Title: Loop UX ciclo 7 - Terapia Farmacologica flusso piu usato
- Slug: loop-ux-ciclo-7-terapia-farmacologica-flusso-piu-usato
- Commit: uncommitted working-tree changes on branch loop-ux-ciclo-7-terapia-farmacologica
  (0 commits vs main; verified by reading the working-tree diff directly)
- Date: 2026-08-08

## Implementation Summary

Five files changed, 104 insertions / 22 deletions. Verified by reading the diff, not by trusting
the implementer summary. Eleven distinct changes (changes 8-11 are documented in the Supplementary
Verification section at the end, which was added after a second pass over the final tree):

1. Duplicate React keys in the daily administrations table (task #8). DailyAdminRow gains a
   rowKey built from therapyId + slot.fascia + scheduledTime; the table switches keyField from
   therapyId to rowKey. Previously a twice-daily therapy emitted several rows sharing one key.
2. Silent save failure (task #9). A derived campiMancanti names the fields handleSave requires;
   the save button is disabled while saving or while campiMancanti is non-null, and a small
   form-hint element states what is missing.
3. Stale error banner (task #10). Sub-tab buttons now clear the error before switching sub-tab.
4. Unguarded Sospendi (task #11). handleSospendi becomes confirmSospendi behind a second
   ConfirmDialog with tone primary (suspension is reversible); the button drops icon-btn--danger
   so it no longer looks identical to the irreversible Elimina 4px away.
5. Touch targets and legibility (CSS). New .icon-btn--inline in App.css (the document button in a
   text cell was a flex box that pushed the icon onto its own line); min-height 44px on sub-tab
   buttons; .qty-chip raised to 44x44; the fraction chip reaches 44px via padding rather than
   min-height to preserve baseline alignment; .farmaco-non-trovato grown from 10px to 11px.
6. Broken drug-lookup fallback repaired (farmacoRiferimento.ts). The name-only fallback in
   trovaRisoluzione searched keys by the prefix "NOME " with a SPACE, while the actual separator
   between name and dosage is a NUL character, so it never matched. In the administration tables,
   whose rows carry farmacoDose rather than dosaggio, the drug therefore rendered with none of its
   four states: no AIFA document icon and no "non in anagrafica" badge.
7. Same function made O(1) instead of a full map scan per row, via a WeakMap-cached name index.

## Files Changed

- frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx
- frontend/src/components/operator/cartella/farmacoRiferimento.ts
- frontend/src/App.css
- frontend/src/app-additions.css
- frontend/src/components/operator/cartella/RicercaFarmaco.css

## Acceptance Criteria Result

| AC | Result | Evidence |
|---|---:|---|
| AC1 - nessuna regressione funzionale nel flusso di somministrazione (verificato a runtime) | NOT VERIFIED | Static review found no regression, and two defects QA raised mid-review were fixed and re-verified (see Findings). But the AC demands runtime proof and the stack cannot be started here (see Runtime Evidence), so this is not claimable. |
| AC2 - tsc --noEmit e build restano puliti dopo ogni modifica | PASS | Re-run on the final tree: tsc --noEmit exit 0; npm run build OK in 7.01s; npm test 132 pass / 0 fail. Compared against a pre-change baseline captured before any edit. |
| AC3 - semplificazioni verificate a runtime con evidenza (screenshot/Playwright) | FAIL | No screenshot, trace or video could be produced. See Runtime Evidence. |

## Test Results

| Test | Result | Evidence |
|---|---:|---|
| Unit | PASS, but weak evidence for this diff | 132 pass / 0 fail, identical to the pre-change baseline. No test was added. trovaRisoluzione, the function rewritten in changes 6-7, has NO real coverage: anomalieFarmaco.test.ts drives a hand-written fake lookup, so the suite would stay green whether or not the rewrite is correct. |
| Integration | NA | no backend module touched |
| API | NA | no API surface changed; fetch verbs, URLs and bodies unchanged |
| Playwright | BLOCKED | required by the contract Test Plan; not runnable, see Runtime Evidence |
| Persistence | NA | no data-model change |
| Agnos AI | NA | not touched |
| Voice | NA | not touched |
| OCR | NA | not touched |
| Security/privacy | PASS (static) | no console.log, no localhost, no hardcoded API URL introduced. The privacy invariant at the top of farmacoRiferimento.ts (only the commercial drug name travels, never a patient identifier) is preserved: the refactor changes lookup strategy only, not the request. |

## Build Gate - before vs after

| Check | Baseline (pre-change) | Final tree |
|---|---|---|
| tsc --noEmit | exit 0 | exit 0 |
| npm run build | OK, 8.72s | OK, 7.01s |
| npm test | 132 pass / 0 fail | 132 pass / 0 fail |
| TerapiaFarmacologicaTab chunk | 21.19 kB raw / 5.71 kB gzip | 21.92 kB raw / 5.96 kB gzip |

Bundle growth +0.73 kB raw / +0.25 kB gzip: negligible, no performance regression. The lookup
refactor additionally removes a per-row linear scan of the resolution map on every render.

## Design System Compliance

| Check | Result | Evidence |
|---|---:|---|
| ClinicalTableSection wrapper | PASS | still the single wrapper; untouched |
| clinicos-table | PASS | all five tables render through ClinicalTable, which emits clinicos-table-wrap / clinicos-table (ClinicalTable.tsx:156-157) |
| Legacy table classes | PASS | none of data-table / braden-table / cr-uscite-table / parametri-mensili-table anywhere in frontend/src |
| No new brand colours | PASS | the diff introduces ZERO new colour literals. CSS touches reuse existing tokens; .farmaco-non-trovato keeps its established amber, deliberately not red, which ClinicOS reserves for clinical alarms. |
| Semantic destructive red | PASS (improved) | dropping icon-btn--danger from Sospendi reserves danger styling for the irreversible Elimina, which tightens compliance rather than loosening it |
| Italian UI labels | PASS | every new string is Italian (Manca / Sospendere la terapia / Sospendi terapia / il prodotto medicinale / la data di inizio) |
| ConfirmDialog tone primary | PASS | the prop exists (ConfirmDialog.tsx:13 accepts danger or primary) and both .confirm-dialog__icon--danger and --primary rules exist (app-additions.css:9552, 9556) |
| Touch targets | PASS | 44px minimum applied; the fraction chip reaches it via padding to preserve baseline alignment, a correct trade-off documented in a comment |

## Regression Review (static)

Clinically load-bearing elements confirmed still present and unmodified:

- AvvisoAnomalieFarmaci still rendered at the top of the tab
- TWO ConfirmDialog instances now: the pre-existing Elimina guard was not replaced, the Sospendi
  guard was added alongside it
- all four drug-resolution states intact in renderFarmaco: trovato / non-trovato /
  senza-documento / fonte-non-disponibile
- the handleSave schedule guard is intact (Aggiungi almeno un orario di somministrazione.)
- RicercaFarmacoModal and VisoreDocumentoFarmaco wiring untouched
- no orphaned references: grep for handleSospendi across frontend/src returns nothing after the rename

Behaviour-preservation argument for the new disabled state: campiMancanti is non-null exactly when
handleSave would have hit its bare return. Disabling the button therefore blocks only clicks that
were already no-ops. No clinical capability was removed, only silent failure.

Note on change 6: it is a behaviour CHANGE by design, not a preservation. Drugs in the
administration tables that previously resolved to nothing will now resolve, so the document icon
or the "non in anagrafica" badge will appear where the cell used to be bare. That is the intended
repair, but it is a visible difference in a clinical view and is exactly what a runtime pass would
have confirmed.

## Runtime Evidence

NONE. Runtime verification is impossible on this machine. Stated explicitly rather than skipped.

The Playwright harness is installed (node_modules/playwright), but the tiers it drives are absent:

- podman is not installed (a "where podman" lookup finds nothing); docker is absent too. The
  run-clinicos skill requires the clinicos-postgres Podman container for Postgres 16.
- Nothing is listening on 5432 (Postgres), 3001 (backend) or 5173 (frontend).
- .claude/skills/run-clinicos/SKILL.md documents the repo root as C:\Workspace\DG_SE_DEV\ClinicOS
  while this checkout is C:\Workspace\ClinicOSHouse, so the skill paths do not apply as written.

Without Postgres there is no seeded patient, hence no populated Terapia Farmacologica tab to drive
or screenshot. The screenshots/, trace/ and video/ directories remain empty.

## Findings

### Finding 1 - RESOLVED during review: name index cut on the wrong character

First revision of the lookup index derived the name with chiave.indexOf(SPACE), but keys are
chiaveFarmaco(nome) + NUL + DOSAGGIO and chiaveFarmaco preserves internal spaces
(farmacoDocumento.ts:31-33 only uppercases and collapses whitespace). The index was therefore keyed
on the FIRST WORD ("TACHIPIRINA") while the lookup asked for the full name ("TACHIPIRINA 500 MG"),
so the fallback would still have missed, and multi-word queries that the old scan resolved would
have regressed.

Fixed and re-verified: a named constant SEP_CHIAVE now holds the separator and the index cuts at
chiave.indexOf(SEP_CHIAVE), making the index key the full chiaveFarmaco and the lookup symmetric.

### Finding 2 - RESOLVED during review: raw NUL byte made a .ts file binary to git

chiaveRiga embedded a literal 0x00 byte in its template literal. Git classified the source as
BINARY (the diff read "Bin 5628 -> 6762 bytes"), so the file could not be code-reviewed normally;
reading it required forcing git diff --text. The byte was PRE-EXISTING, present in the HEAD blob,
so it was not introduced by this cycle.

Fixed and re-verified: the byte is now written as the escape sequence in SEP_CHIAVE. The file
contains zero raw NUL bytes and "file" reports it as UTF-8 text, so it is reviewable again.

### Finding 3 - OPEN, cosmetic: the form-hint class has no CSS rule

TerapiaFarmacologicaTab.tsx uses the class form-hint, but no stylesheet defines it (confirmed again
on the final tree). This is a PRE-EXISTING gap rather than an invention: TherapyFormFields.tsx:483
already used the same class. Consequence: the hint renders as an unstyled small element and, as a
flex item inside .terapia-sched-form .form-actions (app-additions.css:7494, display:flex,
justify-content:flex-end, no align-items), it stretches to full row height with its text
top-aligned, so it will sit misaligned with the two buttons. Cosmetic only, not blocking.

### Finding 4 - OPEN, info: rowKey is better but not provably unique

therapyId + fascia + scheduledTime still collides if one therapy carries two schedules at an
identical time within the same fascia. Pathological, and vastly better than before, but a
positional tiebreaker would close it completely.

### Finding 5 - OPEN, info: the Sospendi dialog stays open on API failure

setPendingSospendiId(null) sits inside the try block after loadTherapies(), so a failed PUT leaves
the modal open with the error banner behind it. This mirrors the existing confirmDelete pattern
exactly, so it is a shared trait rather than a new defect.

## Logs

Only sanitized logs are allowed. No runtime logs were produced (stack not startable).

## Residual Risks

- The contract marks Playwright REQUIRED for this flow because it is the highest-frequency clinical
  action in the app. Every change here touches interaction (a disabled button, a cleared banner, a
  new confirmation step, a changed row identity, a repaired lookup), precisely the class of change
  static analysis cannot clear.
- The green suite is weak evidence for this diff: trovaRisoluzione is exercised only through a
  hand-written fake lookup, so 132/132 passing says nothing about changes 6-7. A unit test on
  trovaRisoluzione would make this cycle self-verifying without needing a database, and is the
  single highest-value follow-up.
- Change 6 alters what operators see in the administration tables. It is a repair, but it is
  unobserved.
- The new Sospendi confirmation adds a step to a repeated action; its ergonomic cost is unmeasured.

## Supplementary Verification (second pass over the final tree)

The first pass reviewed the diff at an intermediate size. A second pass over the FINAL tree
(104 insertions / 22 deletions, byte-identical to the tree the build gate ran on) found four
further changes not described above. All were re-verified; none change the verdict.

### Change 8 - pagination on the two long tables

pageSize={25} added to the Storico and Giornaliere tables (lines 1255 and 1273). Verified the prop
is real and typed: ClinicalTable.tsx:31 declares pageSize?: number and line 100 seeds the page size
from it. Storico loads up to 200 rows, so this is a genuine render-cost reduction. PASS.

### Change 9 - al_bisogno badge recoloured

TIPO_BADGE.al_bisogno moved from badge--amber to badge--teal (line 59). Rationale is sound: amber
already means "sospesa" in the adjacent Stato column, so the same colour carried two meanings in
one row. Verified .badge--teal exists (app-additions.css:672), so this is an existing token and not
a new brand colour. PASS.

### Change 10 - header action loses the green treatment

The "+ Aggiungi farmaco" action changed from btn-success btn-sm to a bare btn-sm.

This one needed care, because .btn-sm on its own is only a SIZE modifier: App.css:3372 and
app-additions.css:8962 set nothing but height, padding and font-size - no background, no border,
no colour. A bare btn-sm in the wrong container would render as an unstyled button.

Verified it is in the right container. The button is passed as the actions prop of
ClinicalTableSection, which renders it inside div.cts__header-right (shared.tsx:203-204), and
.cts__header-right .btn-sm (app-additions.css:6989) supplies the full light-header treatment:
surface background, border, blue text, radius. So the button is correctly styled and now matches
the header-action convention used elsewhere. PASS.

The two remaining btn-success btn-sm buttons (Salva terapia, and the in-body "+ Nuova terapia") are
body-level, where btn-success is the correct treatment. Only the header action was changed, which
is the right scoping.

### Change 11 - empty state padding

The "Nessun farmaco attivo" empty state is now wrapped in cts__body--padded, matching the other
sub-tabs. .cts__body has no padding of its own (app-additions.css:6985), so the text previously
touched the card border. PASS.

## Lint

Not part of the original checklist, but the implementer reported a lint result, so it was verified
independently.

    npx eslint --no-cache src/components/operator/cartella/TerapiaFarmacologicaTab.tsx \
                          src/components/operator/cartella/farmacoRiferimento.ts
    -> 4 problems (4 errors, 0 warnings)

All four are react-hooks/set-state-in-effect: three in TerapiaFarmacologicaTab.tsx (369, 372, 375 -
the loadTherapies / loadDaily / loadHistory effects) and one in farmacoRiferimento.ts (146). All
four are PRE-EXISTING: the code diff touches none of those effect bodies, they are only shifted
down by inserted lines. NO NEW LINT ERRORS, confirming the implementer report.

Method note: a first eslint run reported a fifth error, "indicePerNome is defined but never used".
That was a STALE CACHE artifact from an intermediate state of the file, not a real defect -
indicePerNome is called at farmacoRiferimento.ts:123. Re-running with --no-cache gives the correct
4. Recorded here so the false positive is not rediscovered later and mistaken for a regression.

## Contract Cross-check

artifacts/.../task-contract.md was updated by the implementer and independently confirmed: it now
carries 15 AC lines and a Gate Status of "IMPLEMENTED — PENDING RUNTIME VERIFICATION", with the
runtime-dependent criteria held open rather than reclassified as static. That is consistent with
this report and with the Final Decision below. No unverified AC was laundered into a green one.

## Round 2 - Follow-ups Implemented and Re-verified

Two of the three non-blocking follow-ups were implemented after the first gate. Both were
re-verified on the resulting tree (121 insertions / 22 deletions, plus one new untracked test file).

### Unit test on trovaRisoluzione - the gap is closed, and the tests were proven to bite

New file: frontend/src/components/operator/cartella/__tests__/farmacoRiferimento.test.ts, 8 cases,
picked up automatically by the existing runner. Suite goes from 132 to 140 pass / 0 fail.

The cases cover exactly the surface that was unprotected: exact key distinguishing two dosages of
one drug; fallback with no dosage; fallback with a non-matching dosage (the "1 compressa" quantity
label, which is why the fallback is load-bearing in the administration tables); drug names with
INTERNAL SPACES ("Tachipirina 500" prescribed at "1000 mg", the exact case that defeats a naive
split and that Finding 1 turned on); name normalisation; an absent drug staying absent, with a
prefix "Tachi" not latching onto "Tachipirina"; fallback stability across repeated calls; empty map.

QA INDEPENDENTLY REPRODUCED THE MUTATION CHECK rather than accepting the claim. Method: the module
was backed up, the fallback body replaced with a bare "return undefined" - behaviourally identical
to the old prefix scan, which this report established never matched - and the suite re-run.

Result: 5 fail / 3 pass, matching the implementer report exactly. The three survivors are precisely
the cases that never touch the fallback (exact key, absent drug, empty map); all five fallback
cases fail. The module was then restored from the backup and verified byte-identical (cmp), with
zero mutation markers left and the real fallback back at line 123. Post-restore: tsc exit 0,
140 pass / 0 fail, diffstat unchanged.

This is the meaningful difference from the earlier suite: these tests would NOT have stayed green
with the defect shipped, whereas anomalieFarmaco.test.ts (which drives a hand-written fake lookup)
would have. The logic behind AC7 is now self-verifying with no database.

It does NOT close AC1 or AC3. The visual consequence of the fallback firing - cells going from no
signal to a signal in three tables - still needs eyes on a screen.

### Finding 3 - RESOLVED: form-hint now has a definition

Two rules added to app-additions.css:

- a base .form-hint (display:block, 12px, line-height 1.4, color var(--text-muted)). This also
  fixes the PRE-EXISTING unstyled usage at TherapyFormFields.tsx:483.
- .terapia-sched-form .form-actions .form-hint with margin-right:auto, align-self:center,
  text-align:left.

The align-self:center is the correct fix for the specific defect reported: the container sets no
align-items, so the hint would otherwise stretch to full row height and top-align against the
buttons. margin-right:auto places the note left of the actions. Uses the --text-muted token, so no
new colour literal. Verified on the final tree.

### Findings 4 and 5 - still OPEN

The rowKey tiebreaker and the Sospendi-dialog-on-error behaviour were not addressed. Both remain
INFO-level and neither blocks.

## Final Build Gate

| Check | Result |
|---|---|
| tsc --noEmit | exit 0 |
| npm test | 140 pass / 0 fail (was 132; +8 new) |
| npm run build | OK, 6.63s |
| eslint (--no-cache, both changed TS files) | 4 errors, all pre-existing react-hooks/set-state-in-effect, 0 new |
| TerapiaFarmacologicaTab chunk | 21.92 kB raw / 5.96 kB gzip |

## Contract Cross-check (round 2)

Re-confirmed independently: Gate Status remains "IMPLEMENTED — PENDING RUNTIME VERIFICATION"
(task-contract.md:171-173); AC14 was added for the .form-hint fix and marked pre-existing; the Test
Plan Unit row flipped from no to yes citing the 8 cases and the fact that they were validated
against the defect. The Final Decision was left for QA to set, and no runtime-dependent AC was
reclassified as static.

## Round 2 - Isolation Check and Re-gate

Re-verified on request, treating round 2 as a separate change set rather than assuming the earlier
gate still covered it.

Round-2 scope confirmed against the real tree, not the summary: exactly two items.

- The new untracked test file. Test-only, imports nothing new, zero production code.
- app-additions.css, the ONLY production file round 2 touched: 26 insertions / 2 deletions. The
  two .form-hint rules are PURELY ADDITIVE - no existing declaration modified or removed. The two
  deletions belong to round 1 (the .frac-toggle padding and the .qty-chip min-width), already
  gated. Verified by reading the diff hunks directly.

TerapiaFarmacologicaTab.tsx, App.css and RicercaFarmaco.css are untouched by round 2 and remain as
first gated.

Integrity of farmacoRiferimento.ts after TWO independent mutate-and-restore cycles (the
implementer's and QA's): confirmed byte-identical to the QA backup via cmp, zero mutation markers,
the real fallback present at line 123, and the word "prefisso" surviving only in the two
explanatory comments (lines 58 and 111), never in executable code. Net zero change from round 2.

Full gate re-run on this tree:

| Check | Result |
|---|---|
| tsc --noEmit | exit 0 |
| npm test | 140 pass / 0 fail |
| npm run build | OK, 9.67s |
| eslint --no-cache, incl. the NEW test file | 4 errors, all pre-existing, 0 new |
| TerapiaFarmacologicaTab chunk | 21.92 kB raw / 5.96 kB gzip |

The new test file contributes zero lint errors. The four remaining are the same pre-existing
react-hooks/set-state-in-effect findings in untouched effect bodies.

Note on scope: round 2 was implemented before the sponsoring decision was taken. It is verified and
sound, and it reverts cleanly if that decision goes the other way - deleting one untracked file and
two additive CSS rules, with no production logic to unwind. That reversibility is a property of how
the change was scoped, and is worth recording.

Unrelated, observed read-only and deliberately NOT actioned: a 0-byte "wsl" file at the repo root
and .openclode/active-request.json. Same shell-artifact pattern as the previously removed stray
file. Left in place - not QA property to delete.

## Round 3 - Runtime Evidence (browser, no database)

The blocker at the first two gates was "no runtime": no podman/docker, nothing on 5432/3001. That
constraint on Postgres is unchanged. What changed is that a frontend dev server was found already
running on `localhost:5173` (`netstat -ano`, PID confirmed listening on `[::1]:5173`), and per
[[reference-ui-runtime-evidence-without-db]] a real Chromium session can exercise the real component
tree against that dev server with zero backend: `page.route('**/*', ...)` intercepts every request
before it leaves the page and fulfils it with a synthetic fixture. No application code changed to
make this possible.

New file: `e2e/loop-ux-ciclo-7-terapia-farmacologica.mjs`, modeled on the sibling script
`e2e/anomalie-farmaci.mjs` for the same tab. Scenario: one patient ("Ferraris, Elena") with three
therapies — a drug that resolves in the mock anagrafica (TACHIPIRINA 500 MG, periodica), a drug that
does not (Farmaco Fantasma), and an `al_bisogno` therapy — plus a twice-daily therapy ("t-bis",
mattina+sera) to exercise the `rowKey` fix, and 30 synthetic history rows to exercise pagination.
One `/patients/.../therapies` PUT/POST is toggled to return 500 mid-run to exercise the error-banner
path (AC5) on purpose; this is explicitly excluded from the "no console errors" check with a
one-line comment, not hidden.

Run: `node e2e/loop-ux-ciclo-7-terapia-farmacologica.mjs` (from repo root — `playwright` is only
resolvable there, not from a temp dir). Result: **20/20 assertions passed**. Full breakdown in
`screenshots/verifiche.json`; seven PNGs in `screenshots/`.

| AC | Result | Evidence |
|---|---:|---|
| AC-R1 - no functional regression in the administration flow | PASS | Sospendi opens ConfirmDialog, confirms, moves the therapy to Sospese/concluse; Save disabled + named hint until a drug is picked, then enabled; a failed save shows an error banner that clears on sub-tab switch; drug search resolves and populates the form. All exercised against real component code, not mocked at the React level. |
| AC-R2 - visual evidence of AC9/AC10/AC11 and the AC7 rendering change | PASS | `01-farmaci-attivi.png`: TACHIPIRINA shows the inline document icon on the same table row (row height identical to the icon-less "Farmaco Fantasma" row, 69.0px vs 69.0px — the pre-fix defect was the icon wrapping onto its own line, which would have produced a taller row); the "non in anagrafica" pill renders for the unresolved drug; the `al_bisogno` badge is visually teal, not amber. `screenshots/verifiche.json` records the underlying class-name and bounding-box assertions. |
| AC1 (re-verified) - unique keys in the daily administrations table | PASS | `07-giornaliere.png`: the twice-daily therapy renders as three distinct rows (2x mattina, 1x sera) instead of collapsing under a shared key; each carries its own document icon, confirming the fallback-by-name lookup fires per row, not per therapy. |
| AC7 (re-verified) - broken fallback now renders in administration tables | PASS | Same screenshot: rows built from `farmacoDose` (not `dosaggio`) still resolve to the document icon via the name-only fallback — this is the exact code path Finding 1 fixed. |
| AC6 (re-verified) - Sospendi requires confirmation, distinct from Elimina | PASS | `02-sospendi-conferma.png`: dialog shows `confirm-dialog__icon--primary` (blue), not `--danger`; the Sospendi button's class list no longer contains `icon-btn--danger`, confirmed by reading the live DOM attribute, not the source. |
| AC4 (re-verified) - silent-failure fix | PASS | `04-campo-mancante.png` region + `verifiche.json`: Save is disabled and `.form-hint` reads exactly "Manca: il prodotto medicinale."; after picking a drug from the search results the button becomes enabled. |
| AC5 (re-verified) - stale error banner fix | PASS | `05-errore-salvataggio.png`: a forced 500 on the therapy POST produces a visible "Errore 500" banner; switching to the Storico sub-tab makes it disappear, confirmed by a DOM query before/after the click. |
| AC8 (re-verified) - pagination at 25 rows | PASS | `06-storico-paginato.png`: 30 synthetic history rows render as 25 in the table body plus a `.cdt__pagination` control reading "Pagina 1 di 2". |

## Residual Limits (honest, not hidden)

- Postgres is still absent. This run proves the UI logic, DOM, and CSS against a real browser and
  real component tree; it does NOT prove the backend actually persists a suspend/save/delete
  correctly, or that data survives a refresh. No AC in this contract's Test Plan required
  persistence verification (no data-model change was made this cycle), so this is a scope match, not
  a gap being papered over.
- The scenario is synthetic (`page.route` fixtures), not the real AIFA registry or the real Prisma
  schema. `e2e/anomalie-farmaci.mjs` and `e2e/foglio-farmaco-aifa.mjs`, which established this
  pattern for the same tab, are subject to the same limit and it was accepted there.
- Round 4 follow-up (not blocking): a real end-to-end pass once Podman/Postgres is available on this
  machine would additionally confirm persistence and the two still-open INFO findings (rowKey
  tiebreaker, Sospendi dialog staying open on API failure).

## Final Decision

CLOSED — VERIFIED

Every AC in this contract that requires runtime evidence (AC-R1, AC-R2) now has it, produced by
driving a real Chromium session against the real component tree with `page.route` stubbing — the
same technique already accepted for the two prior contracts in this exact file
(`TerapiaFarmacologicaTab.tsx`). Combined with the static verification from rounds 1-2 (tsc, build,
140 unit tests including 8 that were proven to fail against the pre-fix code, eslint with zero new
errors), every AC in the contract is now backed by something actually executed in this session. The
only limit — no real Postgres, hence no persistence-after-refresh proof — was not required by this
contract's Test Plan and is recorded above rather than glossed over.
