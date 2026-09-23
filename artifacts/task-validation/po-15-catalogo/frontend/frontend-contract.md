# PO15 frontend delivery contract

Implemented in `C:/Workspace/ClinicOSHouse-worktrees/po15-catalog-ui`, branch `codex/po15-catalog-ui`, baseline `f445260a4ca4de872c1361ff19fc215179b097fe`. Root authorized application work after PO14 live/health200/alias/read-only smoke and receipt `258f6104`. Application claims are released; root owns integration, browser QA4196, HTTP/PostgreSQL, rendered print and publication.

## Agreed DTO

The authoritative backend snapshot is `backend-contract.snapshot.md`, SHA256 `02f5a046ca85531902744136ae2534f782abb14136fb3b0cb78cf219ead09e23`. Its preparatory heading is retained because this file is an exact agreed-contract copy; the final intake-review pair in its addendum supersedes earlier proposals.

`GET /patients/:patientId/assessments/catalog` accepts no query parameters, uses operator patient scope and private/no-store, and returns exactly five ordered items: `painad`, `postural_transfers`, `tinetti`, `mna`, `gds15`. Each item has current `type` and `formVersion`, `latestFinal: null | {id,formVersion,assessedAt,createdAt,finalizedAt}`, exact safe nonnegative integer `ownDraftCount`, and `latestOwnDraft: null | {id,formVersion,assessedAt,createdAt,updatedAt}`. Dates are canonical UTC ISO instants. Zero count is equivalent to a null latest own draft. Payloads exclude answers, scores, snapshots, document IDs and PDFs.

The parser validates ordered types, versions, exact field domains, dates and count/null consistency. One bounded catalog request uses patient encoding, no-store, AbortController and patient/operator/session fencing. Errors are explicit and retryable. Backend metadata query ordering and terminal-final semantics are defined in the agreed snapshot; actual SQL/HTTP checks belong to backend/root evidence.

## Catalog, entry and navigation

Primary Moduli opens two groups with eight modules. Assistenza e mobilizzazione contains Medicazioni, Contenzioni and Trasferimenti posturali. Scale di valutazione contains Braden, PAINAD, Tinetti, MNA and GDS-15. Every module offers Apri and Nuova compilazione; versioned rows also expose personal/local draft resume. Names/actions render while dates and drafts load. Tutti i moduli returns to the catalog. Existing TAB_GROUPS/Agnos destinations remain valid; NRS links open read-only history.

Legacy dates come from `medicazioniFerite[].data`, `contenzioni[].dataInizio` and `valutazioniBraden[].data`. The reader chooses the latest valid clinical date and distinguishes no records, existing undated records and malformed data. Follow-up/created timestamps are not substituted for clinical dates.

Five versioned New actions use the existing App-owned draft store without persistence. An explicit local key prevents automatic current-record reads from replacing that selection. Existing personal, local and correction work stays in the store. No App or core assessment draft-store source was changed.

Three legacy New actions open/focus existing forms without saving. Visited legacy components remain mounted but hidden within the same patient detail, preserving form edits during catalog navigation. Patient-bound keys and the existing patient-detail remount separate patients. Medicazioni/Contenzioni New during an existing edit hides the form behind an explicit choice: Riprendi modifica preserves ID and values; Annulla modifica e inizia nuova clears ID and starts the empty form. Internal New actions use the same discard transition, startEdit clears a stale gate, and resume/discard returns focus to the form. Production transition and SSR structure are tested; root verifies actual interactions and synthetic PUT identity.

## Read-only NRS and retained intake

NRS provides history, details and selected-record print with no create/edit/delete actions. Only actual numeric integer scores 0 through 10 receive severity; missing, fractional, string and other invalid values remain readable without a fabricated score. No clinical author, date or finalization is invented, and NRS is never converted to PAINAD.

New intake choices are the same eight modules. The editable dolore registry is disabled. Existing `data.dolore` is shown read-only with a notice distinguishing retained draft data from chart-confirmed evaluations. `buildConfirmCartella` no longer maps that branch into `valutazioniNRS` and leaves its input unchanged. Backend confirmation retains the original draft JSON. Vital-sign NRS/dolore and `data.parametri` remain unchanged.

The existing intake-review response retains all therapy fields and adds the exact pair:

- Success: `legacyPainDrafts: [{draftId,confirmedAt,pain}, ...]`, `legacyPainError: null`.
- Overflow: `legacyPainDrafts: null`, `legacyPainError: 'intake_review_legacy_pain_too_large'`.

Both are HTTP200. Only both fields omitted defaults to an empty list/null for old-server compatibility. Partial pairs, unknown codes and incoherent combinations are invalid. Original pain JSON including null/false/0/object/array remains exact. Confirmed, patient-scoped drafts with an own dolore property are ordered by confirmedAt descending/nulls last, then ID descending. Inclusive backend bounds are 100 drafts and 2,097,152 bytes, checked before loading pain. There is no global HTTP413 or legacyPainDraftsError object.

The NRS view and therapy panel share a patient/session-fenced intake-review hook. Overflow renders an explicit retryable error only for intake pain; Cartella history and therapies remain available. Clinical fields/notes appear first, original JSON is secondary disclosure, confirmation dates use Italian Europe/Rome presentation and are labeled as confirmation metadata.

Print uses one tab-owned selection cloned with patient and provenance into one portal directly below body. The print marker hides other body children only during selected NRS printing. afterprint, print failure and unmount clean up the marker; the NRS session is patient-keyed. SSR proves selected-document structure, while actual browser print isolation/lifecycle remains root QA.

## Validation and boundaries

Final source has 31 files (17 modified, 14 new), sourceStateId `e6e5cdfe1e5b3c970933e0749e28ee20d6eede47efdaf60af1e25d93e8c6920c`, runtimeSourceId `fa36a69fd25f736455ecfcdd807cfab0e57d0d13065d59527f3efa08df4b6786`. The final capture precedes the passing 173 tests across 37 files and production build. Differential lint covers 30 TypeScript files: 16 baseline and 16 candidate diagnostics, none introduced. Known secret signatures cover 31 sources plus 112 emitted text files, with no findings. Whitespace and exact protected-file checks pass.

Tests load the production code with the existing CSS loader and an evidence-local shim for PDF worker URL imports and Entra import.meta.env. They do not authenticate or start the PDF worker. The earlier test-po15-focused.log records a superseded missing-asset-loader diagnostic; the authoritative test-focused.log includes all its suites and passes.

Final receipts bind changed inputs, 549 baseline source/config inputs, 532 unchanged inputs, protected files, lint inputs and scanned bundle inventory. Candidate scope totals 563 inputs. There is no separate PO15 FE/BE runtime parity suite or worker benchmark. No worker package/lockfile/backend/schema/shared dependency/server/port/commit/push/deploy/live-patient write occurred.
