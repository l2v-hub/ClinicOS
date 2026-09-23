# PO-06 frontend implementation and verification plan

Preparation only. Application baseline `0418463a94801bf2d22bdb3155eb6d4a05e9a2dd`; execution awaits root GO. The task contract governs scope and current DTO agreement.

## Inspected behavior and implementation boundaries

| Surface | Observed baseline | Planned change after GO |
|---|---|---|
| Patient roster | Desktop table and cards independently render name/DOB/CF; location absent; `incompleteDemographicFields` includes phone | Shared presentational identity model/component; location near name; CF/DOB-only display status; preserve columns, actions, search and existing sorting behavior |
| Parameter entry | `ParameterPagePatient` selects ID/MRN/name only; row receives room/bed from cartella JSON; summary pending/unavailable already separate | Extend minimal patient projection and pass it into identity display; preserve row keys/state and all parameter save logic |
| Therapy parser | `parsePatient` drops future CF/DOB/location fields and maps missing old room/bed to `Non assegnato` | Parse and retain the projection; absent or invalid location is unavailable, never asserted unassigned; map `patientId` internally |
| Therapy modal | Patient header 13px versus drug name 13px; header not sticky; repeated “Erogata/Non erogata” buttons lack patient/drug-specific names | Sticky scoped patient header, stronger name hierarchy, distinct drug rows and contextual accessible action names; no action/paging/date algorithm changes |
| Handover card | Inline `ConsegnaCard` in `ConsegnePage.tsx` can offer chart link based only on existing name and patient ID | Non-null identity enables existing chart context; null identity renders authorized fallback name without chart link or lookup |
| Handover create | Existing `PatientCombobox` handles bounded authorized search; selected chip prints `Scheda {medicalRecordNumber}` | Minimal presentation reuse in selected/option identity; retain search/keyboard/select logic and submit semantics, remove visible MRN |

No dependency runtime or node_modules junction was present during preparation; no installation or junction was created. Root may provide the read-only dependency junction for execution.

## Small shared model

Add a minimal `PatientIdentityData`/location type and a pure display adapter in `frontend/src/lib/patientIdentity.ts`, then the shared `PatientIdentity.tsx` and scoped CSS. Reuse the existing calendar-safe birth-date formatter, not the broad intake completeness helper. Names remain plain React text; long names/CF/room labels wrap without truncating the only identifier.

The presentation has a name row, an identifier row (CF; otherwise birth date if usable plus the appropriate missing-identity state), and a location row. Identity completeness depends only on CF and DOB supplied in this DTO; omitted phone/email/sex never manufactures incompleteness. Client loading is an explicit prop/view state outside the server location union. Absent old API projection maps to unavailable. A present `unassigned` server result alone permits the unassigned label.

The component owns no click/fetch/navigation logic. Consumer-native buttons or links own authorized actions. A compact/name-location option and the same identifier formatter can preserve the roster's existing separate fiscal column without showing duplicate identifiers. Handover fallback accepts a plain authorized name only, never manufactures an ID-backed identity object from it.

For therapy, add narrowly scoped modal styles rather than growing the large global stylesheet. Each patient wrapper contains its sticky header and drug rows; sticky behavior is bound to `.therapy-modal__body` and the patient's group so the next group replaces the previous context. Patient labels and drug labels remain distinct at narrow widths and 200% zoom.

## Proposed source/test ownership after GO

- Shared: `frontend/src/components/shared/PatientIdentity.tsx`, `PatientIdentity.css`; `frontend/src/lib/patientIdentity.ts`; minimal additive definitions in `frontend/src/types.ts`.
- Reader adapters as needed: `frontend/src/lib/patientPage.ts`, `patientParametersPage.ts`, `therapySlotPage.ts`, `consegneFeed.ts`. No endpoint, query-limit, cursor, summary, sorting or mutation contract changes.
- Consumers: `frontend/src/components/operator/PatientRoster.tsx`, `ParameterEntryRow.tsx`, `MultiPatientParametri.tsx`, `TherapySlotModal.tsx`, new scoped `TherapySlotModal.css`, `ConsegnePage.tsx` (inline card), `ConsegnaCreateForm.tsx`.
- Shared combobox presentation: `frontend/src/components/shared/PatientCombobox.tsx` and, only if needed, its CSS/model; this is a necessary narrow removal of the existing visible MRN in the assigned handover create flow, not a new search workflow.
- Existing consumer CSS only where composition requires it: `PatientList.css`, `PatientParameters.css`, `ConsegnaCreateForm.css`. Avoid unrelated global style changes.
- Focused new helper/render/event tests and updates to the existing tests whose guarded presentation is deliberately moved into the shared component. Retain behavioral assertions instead of merely deleting old static checks.

## Execution sequence after GO

1. Activate exact application claims; verify baseline/protected hashes, root-provided dependency junction and final backend contract. Confirm the projected fields are additive at all four readers before relying on them.
2. Implement and test the pure identity/location boundary and shared presentational component. Cover missing/malformed projection without any network activity.
3. Integrate roster and parameters while keeping patient keys, requests, pending readings and separate clinical summaries unchanged.
4. Integrate therapy parsing/rendering and scoped sticky header/action labels. Preserve clinical payloads and date binding.
5. Integrate handover card/create and minimal combobox presentation. Gate chart links on authorized identity rather than handover visibility.
6. Run the focused regressions, build and scoped lint. Inspect the diff for unrelated changes, unexpected requests, identifiers in logs/storage and accidental sort mutations. Produce exact hashes/receipts and release claims to root.

## Test matrix

| Area | Cases and observable result |
|---|---|
| Identity | Two homonyms with distinct CF/DOB; long accented/hyphenated names; valid CF preferred; missing CF uses DOB; missing/invalid DOB has no invented value or age; CF/DOB completeness ignores absent phone; no MRN in rendered output |
| Location | Assigned room+bed; assigned room without bed; explicit unassigned; unavailable; absent/malformed projection; client loading; cartella provenance; historical `asOf`; source enum mismatch rejected or rendered unavailable, never silently replaced by legacy scalar |
| Reader preservation | Page/parameters/therapy/consegne payloads retain fields through parse and page merge; existing IDs/summaries/administrations/cursors remain unchanged; missing optional rollout field is distinguishable from unassigned |
| Parameters | Draft values and unsaved note survive projection refresh, day/summary changes and page append; uncertain request body/key unchanged; room search still reaches the same existing bounded endpoint |
| Therapy | Patient and drug named in accessible actions; exact patientId/therapyId/date payload unchanged; no administrative signing controls in read-only mode; partial-list/exact-summary state retained; sticky group header follows group boundaries |
| Handover scope | Identity object displays provided context and permits existing authorized chart action; identity null/absent leaves only existing name, no chart action and no additional fetch; feed order, content ownership and transitions unchanged |
| Create/combobox | Existing keyboard selection and bounded search remain; selected identity visible; no MRN in selection/options; clearing selection clears context; submit retains selected patient ID and explicit-save behavior |
| Browser by root | Mobile/tablet/desktop, 200% zoom, keyboard focus and 44px targets, long names, many drugs, scroll across two patient groups, same-name patients, delayed/failed location reads and scope-null handover |

Relevant existing regression files include `patientPage.test.ts`, `patientParametersPage.test.ts`, `parameterEntrySummary.test.ts`, `patientParameterReadings.test.ts`, `patientParameterWorkspace.test.ts`, `patientListIdentityGuard.test.ts`, `therapySlotPage.test.ts`, `therapyPages.test.ts`, `therapyNavigationGuard.test.ts`, `therapyAgendaDateGuard.test.ts`, `consegneFeed.test.ts`, `consegneReadModelGuard.test.ts`, and operator `parameterNotes.test.ts`.

Final focused regressions: 74/74 pass; frontend build passes. The broader initial run passed 75/76, with one unchanged agenda guard failure that expects text absent from the baseline. Scoped lint passes outside MultiPatientParametri; its two errors/two warnings are identical to the baseline, as bound by `baseline-comparison.json`. Root reserves port 4187 for synthetic integrated QA. Query counts/latency comparisons belong to the combined runtime baseline/candidate validation; this frontend adds no per-patient or room-administration fetches.

## Remaining gate

Root GO and final backend DTO confirmation were received. Implementation is complete; root owns browser keyboard/mobile/200%/sticky geometry, dynamic draft-refresh and click-payload checks, combined backend QA and any publication decision. Final manifests/receipts bind the frontend candidate to the exact source snapshot.
