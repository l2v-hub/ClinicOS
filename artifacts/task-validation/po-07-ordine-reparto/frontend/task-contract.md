# PO-07 frontend implementation contract

Status: **IMPLEMENTED AND VALIDATED; released for root integration**. Claim lifecycle and exact source/evidence receipts are recorded separately.

Owner `/root/po01_frontend_audit`, integration owner `/root`. Worktree `C:/Workspace/ClinicOSHouse-worktrees/po07-roster-ui`, branch `codex/po07-roster-ui`, source baseline `853b40750c25f24ef40db622674612aaf64bf2cb`. Root issued GO after verified PO-06 publication. Frontend source changes and focused validation are authorized; root owns browser QA, integration and publication.

Authoritative contract: `C:/Workspace/ClinicOSHouse-worktrees/subtle-dashboard-notifications/artifacts/task-validation/po-07-ordine-reparto/task-contract.md`. Product references: `docs/product/piano-po-feedback-2026-09-22.md` PO-07 and `docs/product/note-implementazione-piano-2026-09-23.md`. Root's latest decision preserves the existing CF/admission/signals header sorting as an explicitly temporary order of loaded rows. The shared name/location control restores global server order and cancels that local mode.

## Outcome and authority

Provide one compact, accessible Cognome / Camera e letto and ascending/descending control across Pazienti, Parametri and Terapia. Personal preference is persisted by authenticated profile/context with CAS; a department default is editable by authorized admin/manager. The department context is presentation configuration, never a patient authorization filter. Labels and permissions come from the DB-backed API, never `App.utente.reparto` or mockData.

This worker owns the claimed frontend/types/CSS/tests/App scope until claim release. Root integrates, performs browser QA/benchmark and owns publication. Backend worker owns DTO/schema/migrations/readers/epochs. No dependencies, manifests/lockfiles, generated packages, servers/ports, commits, pushes, deployment or worktree deletion by this worker. The existing read-only dependency junction is reused. No Consegne roster implementation before PO-08.

The root-led hierarchical team satisfies swarm coordination; no additional agents are spawned. SPARC structures specification/design/verification. Read-only Ruflo guidance was advisory: registered capabilities do not establish health or authority. Memory recall found the older `clinicos-patient-roster-sort-20260919` loaded-page sorting pattern; it applies only to preserved legacy temporary header modes, not the new global order.

## Agreed wire contract

```ts
type Order = { criterion: 'name' | 'location'; direction: 'asc' | 'desc' };
type RosterContext = { id: string; label: string; version: string };
type RosterMetadata = {
  context: RosterContext | null;
  order: Order;
  source: 'personal' | 'department' | 'system' | 'temporary';
  revision: string | null;
  temporary: boolean;
  asOf: string;
  epoch: { roster: string; therapy?: string };
};
type RosterPreference = {
  context: RosterContext | null;
  default: Order | null;
  override: Order | null;
  effective: Order;
  source: 'personal' | 'department' | 'system';
  revision: string | null;
  canEdit: boolean;
  canEditDefault: boolean;
  temporary: boolean;
  reason: 'profile_missing' | null;
};
```

- GET/PATCH `/me/roster-order`; PATCH body `{contextId, override: Order | null, expectedVersion: string}`. No client-selected operator ID. Personal revision `'0'` means no preference row yet; `null` means missing profile. Reset retains/increments the backend version. A missing profile has context null, temporary true, canEdit false and no implicit profile creation.
- GET `/admin/roster-contexts`, bounded 50/max100, returns `{items,hasMore,nextCursor}`; PATCH `/admin/roster-contexts/:id` body `{default: Order | null, expectedVersion: string}` returns `{id,label,default,version}`. Admin default edits and personal overrides have distinct controls and explanations. Confirmed CAS codes are `roster_preference_conflict` and `roster_default_conflict`; outdated context uses `roster_changed`.
- Page query options: `sort=name|location`, `direction=asc|desc` as a pair, optional authenticated-profile `contextId`. Omission uses server effective order. Patient identity page/search also accepts optional `asOf=YYYY-MM-DD`; parameters bootstrap sends the same day/order/context as the detailed parameter query.
- Existing patient/parameter `items/hasMore/nextCursor` and therapy `slots/pageInfo` remain intact; a top-level `roster` field is additive. Search names/CF stay in the POST body, never URL or persistence.
- Epoch and CAS versions stay decimal strings; no Number conversion. Cursors are opaque. Server binds view/actor/scope/context/order/filters/asOf/epoch and reconstructs patient(+therapy) anchors in the same snapshot. Client never decodes or repairs a cursor.
- `409 code: roster_changed` invalidates the whole page sequence. Abort stale requests, refresh configuration if context changed, and reload the first page with preserved per-patient drafts. A bounded automatic retry avoids loops when data changes repeatedly. Preference/default CAS409 refetches current configuration; never auto-overwrite a competing change.

## Acceptance criteria

1. Current criterion, direction, department label and source are visible. Saving, saved, temporary, retry and conflict states are truthful. Missing profile or unavailable preference storage explicitly means temporary order; no simulated persistence.
2. Only name/location is persisted. Existing CF/ricovero/segnalazioni header modes remain available and visibly say they apply only to loaded rows, even when there are more pages. Selecting the shared control clears local mode and uses response order without a second local sort.
3. Pazienti/Parametri/Terapia receive order before the server limit. Query/date/order/context changes and roster_changed reset pagination and abort/discard stale responses. Append merges preserve server order and existing exact clinical summaries.
4. Parameter drafts are held in session-local workspace memory keyed by patientId and include values, note, notesOpen, pending request/requestId/measuredAt, uncertain outcome, saving/error/saved feedback. Removing/remounting a row for sorting/paging never loses or transfers a draft; concurrent/remounted retries cannot duplicate a pending save. No patient draft enters localStorage/sessionStorage or a module-global store.
5. Logout/session change destroys the draft/preference state and invalidates late callbacks. Department context cannot expand or narrow patientScope. Changing department while paging triggers refresh/reconciliation rather than using a stale cursor/context.
6. Therapy preserves patient IDs, therapy IDs, action date/time, administration statuses, loaded detail behavior and exact totals. Remove only the client alphabetical override when the server now determines order. PO-06 identity, sticky group headers and contextual actions remain intact.
7. Default editor is offered only with server permission and uses context ID/version from the response. Save of a department default does not mutate personal overrides or other operators' personal state. Context list remains bounded with load-more/retry where needed.
8. Controls wrap at narrow widths, have labels, visible keyboard focus, 44px targets and accessible status. Preserve selections by ID, not row index. Legacy local sort has a visible explicit scope label.
9. Focused parsing/state/event tests, reader/cursor regressions and build pass; baseline-only lint/guard issues are disclosed with source-bound evidence. Root owns real browser geometry/200%/keyboard/network and baseline/candidate performance comparison.
10. Final claim release follows exact source manifests, protected-hash checks and evidence receipt. No publication by this worker.

## Execution policy receipt

`ALLOW_FRONTEND_IMPLEMENTATION_AND_LOCAL_VALIDATION`: root assigned this isolated checkout and issued GO after PO-06 verification. This worker changed only frontend sources/tests and the assigned artifact directory. The dependency junction was reused read-only; no server, port, commit, publication or dependency mutation was performed. Protected launcher modifications are outside this workstream and remain byte-identical. The preparation receipt remains historical evidence of the earlier inactive phase.

Initial roster, parameter and therapy reads run in parallel with preference GET, omitting explicit sort/direction/context so the server applies its real effective order. Their options remain stable when metadata or preference merely becomes ready. Pending/unverified preference is visibly temporary; a late differing preference starts one new page sequence. A user selection explicitly binds order/context and persists only with server permission. Backend confirmed explicit order equal to persisted effective order returns non-temporary metadata.
