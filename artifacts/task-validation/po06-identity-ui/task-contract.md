# PO-06 frontend — task contract

Status: **IMPLEMENTED — FRONTEND CANDIDATE VALIDATED; ROOT OWNS BROWSER/INTEGRATION**.

Owner: `/root/po01_frontend_audit`. Worktree: `C:/Workspace/ClinicOSHouse-worktrees/po06-identity-ui`. Baseline: `0418463a94801bf2d22bdb3155eb6d4a05e9a2dd`. Root authorized PO-06 implementation after verified PO-05 publication, including minimal PatientCombobox rendering. The application claim was activated at `2026-09-23T01:15:01.2787661Z`.

Root contract: `C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/artifacts/task-validation/po-06-identita-posto-letto/task-contract.md`. Product references: `docs/product/piano-po-feedback-2026-09-22.md`, PO-06/07/08, and `docs/product/note-implementazione-piano-2026-09-23.md`, PO-06/07. The newer technical notes and explicit root instructions refine the plan's generic “Non assegnato” wording into distinct loading/unassigned/unavailable states.

## Goal and limits

Show consistent patient name, fiscal identity or birth-date fallback, and room/bed context in the existing patient roster, parameter entry, therapy administration and handover surfaces. Patient identity must remain distinguishable from the drug name and the target of each administration action must be accessible while scrolling.

This worker owns frontend source, types, CSS and focused tests after GO. Root owns integration, dependencies, runtime/browser QA, performance comparison, commit/push and publication. Backend DTO/projection work belongs to `/root/po01_backend_audit` in its separate worktree. No backend, schema, generated package, manifest, lockfile, dependency installation, migration, server, port, commit, push or deployment operation by this worker. PO-07 sorting/cursors/preferences and PO-08 roster/new handover workflow are excluded.

## Agreed additive wire contract

```ts
interface PatientLocationDto {
  status: 'assigned' | 'unassigned' | 'unavailable';
  source: 'assignment' | 'cartella' | null;
  room: string | null;
  bed: string | null;
  asOf: string; // YYYY-MM-DD, day in Europe/Rome; not a timestamp.
}
interface PatientIdentityDto {
  id: string;
  firstName: string;
  lastName: string;
  codiceFiscale: string | null;
  dateOfBirth: string | null;
  location: PatientLocationDto;
}
```

Backend confirmation received during preparation:

- `/patients/page` and existing page search keep their identity-shaped items and add `location`.
- Parameters keep `items.patient` and add fiscal code, birth date and `location` there.
- Therapy slot patients retain `patientId`, first/last name and administrations, adding fiscal code, birth date and `location`; the UI adapter maps `patientId` to identity `id`.
- Handover rows add `identity: PatientIdentityDto | null`. Null is an authorization boundary, not an invitation to fetch the patient.
- Existing therapy `room`/`bed` and parameters `cartella.cameraNumero`/`lettoNumero` remain compatible and derive from the same server projection. Updated UI reads `location`, not these compatibility scalars.
- No additional per-patient API or administrative room API is needed. Historical requests use assignment state on the requested date; legacy cartella location is allowed only today with no assignment history. The client must not reconstruct ended or conflicting assignments.

## Acceptance criteria

1. A shared presentational identity component renders surname/name, prefers available CF, falls back to a valid displayed birth date, and uses “Anagrafica da completare” for missing identity details. It never shows an MRN, “Scheda” internal record number, undefined value, fictional date or age. Completeness here uses CF/DOB only, never the existing helper that also requires phone, which this DTO omits.
2. Assigned, unassigned, unavailable and client loading remain distinct. Missing/malformed projection or failed read cannot become “Non assegnato”. A known assigned room without a bed does not fabricate one. `source: cartella` is visibly identified as cartella-sourced location. Historical context uses the server `asOf` date; legacy values are never presented as historical proof.
3. The component performs no fetching, persistence, authorization inference or sorting. Patient IDs remain internal. Consumers retain their existing authorized actions; nested interactive elements are avoided.
4. Patient roster table and cards reuse the shared identity/presentation model while preserving native accessible actions, existing sort controls, bounded page/search requests, independent clinical-summary loading, and usable rows during refresh.
5. Parameter entry retains per-patient keys, unsaved values/notes, uncertain-save requests, history behavior and exact count/loading states while reading identity/location from the patient projection. Room search continues to use the existing server endpoint and existing paging contract.
6. Therapy retains pagination, exact summaries, date binding, status filters and clinical action payloads. A sticky patient group header stays visible inside the scroll container until the next patient group; name hierarchy, spacing and background clearly distinguish it from drug rows. Action accessible names include patient and drug. Controls retain at least 44px targets, visible keyboard focus and wrapping at 200% zoom/mobile widths.
7. A handover with non-null authorized identity displays that projection. With `identity: null` or absent during a compatible rollout, it displays only the existing authorized `pazienteNome` and removes the chart-opening action, without adding any patient fetch. Feed order, state transitions, ownership controls and summary counts stay unchanged.
8. Handover creation retains its existing authorized patient combobox and submission flow. Its selected identity uses the same CF/DOB/location display; no MRN leaks from the existing shared combobox chip. No new roster, save-and-next flow or extra identity request is introduced.
9. New files stay below 500 lines. Focused DTO/helper/render/event tests, existing relevant regressions, frontend build and scoped lint pass, with baseline failures disclosed rather than repaired outside scope. Root performs real browser/keyboard/zoom/scroll and combined backend verification.
10. Final source manifests and receipts bind all changed files to the baseline, preserve unrelated launcher changes, and release claims before root integration. No benchmark claim is made from preparation or unit mocks.

## Policy decision receipt

`ALLOW_FRONTEND_IMPLEMENTATION`: root's explicit GO permits the exact frontend paths claimed in `claims.json`, focused tests/build and final receipts. It does not authorize backend/dependency/server/port/commit/push/publication operations by this worker. Root's final review requested hiding current Rome `asOf` dates, retaining historical dates and legacy provenance, and explicitly showing `CF da completare` alongside the DOB fallback; these changes are included.

Ruflo guidance and memory search were read-only and advisory. No exact reusable identity/location pattern was found; an older phone-required validation memory is not applicable to the newer minimal DTO and progressive-intake rules. SPARC supplies the requirements/architecture/validation structure; the existing root-led team supplies coordination without another worker or writing session.

Protected pre-existing bytes:

- `run-claude-queue.ps1`: `e280791c291971ec64a760ac453a6476bb8f0302b35f71a3f43dc84db99b1008`.
- `start-claude-team.ps1`: `606dc3da172f5f020d3ea757462db1db8a33553ced03aabeb3db0aec69a70b78`.
