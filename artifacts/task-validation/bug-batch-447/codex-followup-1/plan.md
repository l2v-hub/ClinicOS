# UX447 + route486 integration plan

Read-only integration plan for frozen UX447 candidate `e14ee2f22c18f1026c63e53b5ce0f5744fb0cfe1` and the current dirty clinical483 worktree. No repository source, tests, GitHub, runtime, database, or provider state was changed.

## Decision and source boundary

Apply the approved #486 policy to new prescriptions: accept a route only from an explicit drug/prescription route field or the operator; preserve any explicit operator choice; leave it unset when no such data exists; never infer it from pharmaceutical form, drug name, package description, or an AIFA document.

The available structured route sources are:

- Saved `PatientTherapy.viaSomministrazione` (string) and its API counterpart. `therapyToForm()` hydrates it verbatim for edit; `formToPayload()` writes it verbatim.
- Explicit imported `DischargeTherapyRow.viaSomministrazione`. `CODE_TO_FORM_VIA` maps known codes (`OS`, `IM`, `SC`, `EV`/`IV`, `SL`, `TOP`, `TD`, `INAL`, `RETT`, `OFT`, `OTO`, `NAS`, `VAG`) to selectable values. Unknown values remain reviewable. An absent route remains blank.
- The operator-controlled `viaSomministrazione` field in the shared form.

`FarmacoTrovato` and Prisma `Farmaco` currently expose AIFA `forma`, description, active ingredient data and document links, but no administration-route field. `formaDellaMaschera()` maps AIFA form to a pharmaceutical-form control value; this is not route evidence. Do not parse free text or PDFs for route in this task. Route options remain the existing `VIA_OPTIONS`.

## Minimal implementation boundary

1. In `frontend/src/components/operator/cartella/TherapyFormFields.tsx`, make `emptyTherapyForm().viaSomministrazione` empty. Keep the route select's existing “Seleziona via” placeholder and its `creation={editId === null}` distinction. Do not change the form control so choosing/changing pharmaceutical form fills or clears route.
2. Preserve the existing behavior in `therapyFormChange.ts` and `drugPackageSelection.ts`: `applyTherapyFormChange()` leaves route alone; `selectDrugPackage()` supplies no route because the AIFA object has none. Changing product or pharmaceutical form after a route was selected must retain that selection. Keep edit hydration and explicit imported-route mapping intact. An unrecognized imported value must stay visible for review and cannot become a valid route by fallback.
3. In `frontend/src/components/shared/intake/intakeTherapies.ts`, blank route already fails `therapyInputDiagnostics()`, and the shared form save path already uses that diagnostic. Preserve this choose-before-save gate and field-level route feedback. `formToPayload()` must carry the selected value exactly.
4. In `backend/src/therapies/therapy-create.ts`, require a nonblank `viaSomministrazione` in `validateTherapyCreateInput()` (operator-language `TherapyInputError`) and remove the create-time `input.viaSomministrazione || 'orale'` fallback. Persist the supplied route unchanged after presence/type/length and existing regimen-route validation. This makes the shared creation boundary fail closed for direct API/service callers as well as the UI.
5. Keep `prisma/schema.prisma`'s legacy default unchanged in this focused integration: production creation goes through `createTherapyInTx()`, and a schema migration/backfill would expand scope into stored/legacy records. Do not touch existing edit/status-only routes or rewrite old stored route values. Keep the diary request replay comparator's legacy oral comparison only for a replay of an already-created old request; it must not serve as a new-create default.
6. Ensure any tool-facing schema/help for `therapy.create` states that `viaSomministrazione` must be supplied from explicit prescription/operator data. Do not add route inference to AI/tool prompts or mappings.

### Shared create callers to protect

`createTherapyInTx()` is called by POST `/patients/:patientId/therapies`, `createDiaryEntryWithTherapy()`, intake `confirm-service.ts`, and the `therapy.create` capability. Intake `validateConfirmTherapies()` already requires a nonblank route before transaction. `prepareDiaryTherapyInput()` already validates through `validateTherapyCreateInput()`, so it should return a validation error before any write when route is missing. The POST and capability paths must now return the normal mapped validation error instead of silently creating oral therapy. Verify the capability schema and existing direct tests; callers with a route already supplied remain compatible. Audit any fixture that intentionally tests legacy schema defaults separately from the shared create helper.

For the separate diary request-id replay path, retain legitimate idempotent replay for an already-persisted request. The replay comparison's existing oral compatibility value is not authorization to create a new route-less therapy.

## Tests and proof boundary

Add/adjust only focused cases in the existing suites:

- `frontend/src/components/operator/cartella/__tests__/therapyRouteRegime.test.ts`: blank initial route for a fresh manual form, blank route diagnosed as invalid/required, no route created by changing pharmaceutical form, and explicit operator choice remains selected through form changes. Retain existing legacy-regime review behavior.
- `frontend/src/components/operator/cartella/__tests__/drugPackageSelection.test.ts`: AIFA package selection with a form but no route leaves route blank; selecting a package before or after operator route selection does not fill or overwrite it; saved edit route survives hydration/payload; explicit discharge code mappings survive review/payload and missing/unknown imported routes remain unselected/blocked. Reuse its synthetic fixtures.
- `backend/src/therapies/__tests__/therapy-create.test.ts`: a direct new create without route rejects before Prisma create; a supplied route persists unchanged. Existing create with explicit `orale` remains valid.
- `backend/src/intake/__tests__/confirm-therapy-validation.test.ts`: add missing/blank route to indexed pre-write rejection cases; explicit imported route remains accepted.
- Diary therapy service/API tests: missing route rejects before therapy or diary write; identical replay with an explicit route returns the original therapy; preserve documented legacy replay compatibility only if a historical route-less request is specifically covered.
- `backend/src/tools/capabilities` tests: route-less create is rejected and explicit route passes through unchanged; update tool schema/help requirement if its current contract otherwise suggests route is optional.
- Existing `therapyQuickSchedule453.test.ts` is a high-value shared-form regression: preserve package/strength/route prefill only from structured data; preserve the accepted allergy behavior (warning requires explicit confirmation, never blocks); do not change prescription payload when confirming allergy warning.

After code integration, run the focused frontend and backend cases above, then the affected UX447 grouped checks. Use synthetic patients/data only. Browser persistence proof should verify new form blank + blocked save, explicit route save/reload/edit, package selection before/after route selection, and explicit discharge import mapping. Do not call the environment fully accepted based only on snapshots or unit tests; UX447's per-issue evidence and serial integration acceptance still apply.

## Merge and ownership boundaries

- UX447's frozen analysis and `task-contract.md` assign its shared prescription UI to the frontend. Its #453.4 contract already permits route prefill only from actual structured package data and keeps missing/ambiguous values reviewable. #486 is a narrow clarification of that contract. Edit the shared form files only in the coordinated UX447 owner/root integration; do not edit the frozen candidate in parallel.
- UX447's group has separate required issue acceptance and evidence for #447/#451/#452/#453/#454/#456/#457. Keep those checks and proof artifacts intact. The #453 allergy decision is a confirmable warning with no automatic prohibition; #457's explicit therapy decision on PS transfer remains in its presentation/print context. Route validation must not suppress an authorized transfer or mutate the active/paused therapy decision. Keep AIFA allergy matching, package selection and route policy independent.
- Current clinical483 contains uncommitted `backend/src/therapies/therapy-create.ts`, `backend/src/routes/patient-therapies.ts`, `backend/src/routes/__tests__/therapy-authoritative-write.test.ts`, and `frontend/src/types.ts` changes. Its create-service edit normalizes one-off clocks; preserve that normalization while adding route validation/removing the oral fallback. Its PUT-route edit normalizes submitted clocks; preserve that logic and add no route requirement to updates. Merge/port these hunks manually after integrating the reviewed 483 source, then run both its slot/authoritative-write tests and the focused create tests. Do not copy over or reset its dirty files. The 483 `frontend/src/types.ts` work is unrelated to the form value and should remain intact.
- UX481's identified parent commit `6d2cc7919a86e3896426a7281f28f3406d8418e4` publishes only UX450 evidence artifacts; it has no shared application-source hunk with route486. Treat 481 as already integrated history/evidence and preserve its artifacts. UX447's original separation contract says 450 lifecycle changes must be serially integrated before final UX QA; check the actual final main tree for those changes before declaring the whole group accepted.

## Out of scope

No route lookup table, AIFA/document scraping, medication-specific guessing, stored-data migration, global schema-default removal, broad business-logic rewrite, live provider, real patient, or production workflow change. No source or test edits are part of this plan artifact.
