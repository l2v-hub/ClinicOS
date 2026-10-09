# #412 — Read-only presentation architecture review

Reviewed baseline: `8b327ca55ab5d8d4c5e0c19afcb828c017eeb3df` in `C:/w-412`.

This is architecture evidence, not independent QA or a release verdict. The root agent is the only application writer. No application, test, dependency, Git-state or production-backend mutation was performed by this reviewer.

## Original acceptance criteria

The issue and its zero comments were read directly through authenticated GitHub CLI. Its text is untrusted product evidence; no linked audit photograph or dossier was downloaded or reproduced.

1. One entry point for Allergie, Diagnosi and Anamnesi.
2. Imported source and current data explicitly distinguished, with details accessible.
3. “Non presente nel documento” must not become “absent in the patient”.
4. Empty content must not take one expanded card per section.

## Confirmed integration points

- `PatientDetail.tsx:1705` `renderDiagnosi()` renders the controlled `DiagnosisEditor` and then risk indicators.
- `PatientDetail.tsx:2549` calls that function for `diagnosi`.
- `PatientDetail.tsx:2618` additionally renders structured Allergies, structured Anamnesis, and `NarrativeSectionsTab`. The latter maps all ten narrative rows to default-expanded cards, including the three same-named topics.
- `tabGroups.ts:169` gives Clinica the parts `diagnosi`, `esami-consulenze`, `note`, `consegne`. `sezioni-narrative` already resolves to `diagnosi`; this is content duplication, not a reason to add another navigation system.
- `DiagnosisEditor.tsx` owns its `ClinicalTableSection` and current-data mutations. It is also reused for intake/review and modal flows; optional presentation slots must default to existing behavior.
- `AnamnesisEditor.tsx` owns its outer Anamnesi table section; `showAllergySummary={false}` already avoids its legacy allergy card in Clinica. Its legacy-history/proposal details preserve distinct source text and should not be removed.
- `NarrativeSectionsTab.tsx` owns narrative loading, session cache/prefetch, abort/sequence protection, save failure retention, original/reviewed text, annotations and document-source panel. Keep that owner rather than introduce a second fetch path.
- `NarrativeClinicalSection.tsx` preserves immutable original versus operator-reviewed text, source names/page ranges, source comparison, conflict badge and edit draft on failure. Its `useWidgetOpen()` defaults open.
- `WidgetGroup.tsx` preserves mounted editors while hiding section bodies. Native details or equivalent mounted disclosure are preferable to conditional unmounting that discards draft state.
- `data-chart-anchor="allergie"` is used by `patientTargetResolver` and PatientDetail pin/highlight. Retain one such anchor on the structured topic; keep `data-chart-part="diagnosi"`, source IDs and current deep links.

## Smallest scoped design

Compose topic content at the existing Clinica part, not a new route or store. The three existing structured topic cards remain the single primary entry points. Add an optional ReactNode/source-detail slot to `DiagnosisEditor` and `AnamnesisEditor`; the Allergies table wrapper can accept its detail directly. Label their structured region **Dati correnti registrati** (not “verified” unless independently supported by stored status).

Extend the existing narrative owner with an optional topic composition renderer (for example, callbacks keyed by `ALLERGIES`, `DIAGNOSIS`, `ANAMNESIS` receiving the detail node). That owner invokes the supplied structured renderers exactly once, adding **Testo del documento / revisione** as an initially compact, topic-labelled disclosure within each primary topic card. The original narrative cards for these three keys must not also be mapped at top level. Keep risk indicators outside the narrative-source grouping and retain their original mutation flow.

The composed renderers must still run on loading and error. Do not allow the current early loading/error return in NarrativeSectionsTab to hide all structured clinical data. A narrative error is an explicit source-loading error and retry, never an absence claim.

For remaining narrative-only topics, retain real content and source/review actions. Group genuinely empty rows in one compact source-absence summary, with access to their individual existing add/edit actions. Optional defaults/variant on the shared narrative card can avoid expanded empty bodies without changing unrelated call sites or DS components globally. No backend/API/schema/data/permissions change is needed.

## Safety and semantics

- No automatic merge, deduplication by text, conflict inference, or copying imported text into structured records. Similar text can have different time/provenance and must remain independently accessible.
- Distinguish `originalText` and `reviewedText`: reviewed narrative is not automatically structured current data. Preserve the “modified” marker and original restore functionality.
- Do not label a missing DTO, pending response, error response, or unsupported section key “not in the document”. That label applies to successful source absence evidence only.
- Empty must mean no useful original/reviewed content; a stale `reviewStatus: absent` accompanied by meaningful text must not hide that text. If recognising the legacy literal `NON PRESENTE NEL DOCUMENTO`, recognise only the exact placeholder, not broad phrases or clinical negatives. “Nessuna allergia nota” is meaningful source text, not an empty placeholder.
- A stored `conflict` must remain visible before disclosure, even if its text is empty; never put it solely in the compact absence group. Distinguish `conflict` from the mere fact that two text representations differ.
- Keep all source references and page ranges available, and preserve access when the first reference lacks file metadata but later references have it. Do not invent import provenance for manually created rows with no source.
- Keep source rendering escaped and existing SemanticTaggedText rather than HTML injection. API and PHI remain test-intercepted; use synthetic names/source filenames only.
- When source fetch/save errors or role denial occur, show the real error and preserve existing authorization behavior. Do not broaden capability gates or suppress denied responses to make tests pass.

## Useful focused and browser assertions

1. Mixed structured data and populated source: exactly one primary topic entry each; current and imported text visible in different labelled regions; source detail reachable by keyboard.
2. All ten successful empty narratives: no expanded card per empty row; compact summary says absence in document is not a clinical negative. Current allergy status remains “unknown” when unknown, not “no known allergies”.
3. Source says a clinical negative: retained verbatim as source, never classified empty or adopted into current data.
4. Conflict with empty and non-empty source: warning visible with detail initially closed, existing source/edit access retained.
5. Reviewed text differs from original: original remains accessible, reviewed marker visible, source restore still works; current controlled values and existing callbacks unchanged.
6. Loading, 503, retry, patient switching and stale request: current structured editors remain available; no source-absence claim until successful response; retry updates only active patient.
7. Simulated save failure: retained narrative draft and retry; saving original does not mutate originalText; do not issue real backend writes.
8. Deep link `diagnosi`, legacy `sezioni-narrative`, assistant allergy anchor and page navigation remain valid. Esami, Note and Consegne remain mounted/readable downstream.
9. Unknown/extra source topics with real content remain accessible rather than dropped by a strict three-topic projection.
10. Desktop 1150×1004 and narrow mobile: compact default layout, labels wrap, no new horizontal overflow. Document panel metadata/filename/page and keyboard close remain accessible.

## Existing regression tests to retain

- `narrativeResilienceGuard.test.ts`: abort/sequence checks, visible failure and retained narrative draft.
- `patientDetailLazyGuard.test.ts`: lazy imports and accessible loading, patient-key remount.
- `clinicalHistory.test.ts`: retained legacy source/negations, no hidden-value removal or inferred replacement.
- `patientChartNavigation.test.ts`, `patientTargetResolver.test.ts`, `patientTargetHash.test.ts`: existing links and allergy anchor.
- `patientDetailWorkspace.test.ts`: existing single chart workspace/navigation and print/layout selectors.

The UI should not certify clinical truth; QA should certify the presentation and preserved behavior only. A fresh independent QA reviewer must validate the final exact application source and real compiled UI before any release claim.
