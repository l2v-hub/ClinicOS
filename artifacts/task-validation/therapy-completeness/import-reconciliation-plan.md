# Issue432 reconciliation — locally implemented, not released

Current source89888589ef1fcce8f200899aa07413c8bcb70325 also implements the structured-source reconciliation below. Focused probes/build and fresh final-source independent6browser tests pass;134 artifacts sealed. Full suite retains12 baseline failures and mandatory QA is FAILED VALIDATION. It is not a full import-completeness release.

The scoped implementation follows the investigation plan:

1. Reconcile narrative-parsed rows with every meaningful structured extraction item in each group's `_full.cartella.farmaci`; also cover legacy draft seeding. Keep non-prescription termination #296 unchanged. No model-only dose, times or start date becomes an actionable prescription.
2. Structured items missing from narrative become mandatory-review candidates with exact immutable extracted object and distinguishable source kind. Preserve unknown names, suspended states, additional fields and every occurrence; name-only deduplication is unsafe when dose/frequency/state differ.
3. Add server-owned stable row keys and source metadata. Use one identity comparator in `draft-source.ts` refresh/find/proposal IDs and `draft-mutations.ts` duplicate rejection. Legacy original-text matching remains only for narrative/legacy pairs. Two drugs sharing one raw line cannot collapse into one item.
4. Protect metadata in `guardPageRows` in `draft-mutations.ts`; retain originalText immutability in `intake/draft-service.ts`. Exact selected structured conflict value must authorize the variant, not merely its group membership (same-group different-dose conflicts otherwise authorize both).
5. When no unique source line exists, keep originalText empty and render “Dati estratti automaticamente — confronta il documento” with React escaping; never fabricate text labelled verbatim document evidence. Apply consistent rendering to review, proposals and summary.
6. Test missing headings, post-prose structured drugs without fake prose rows, shared lines, same-name variants/conflicts, duplicate occurrence accounting, unknown fields/names, refresh and group reorder, retained operator fields/exclusions, spoofed source metadata, legacy seed path and omitted-confirmation rejection.

Evidence limits: current screenshots use synthetic intercepted data and browser-only draft storage. They do not prove real database/provider/authentication completeness. Twelve existing full-suite failures remain mandatory QA failures, not waived by matching baseline. Unrelated PR431 browser-e2e failed and was not merged. No production promotion, issue closure or automation resume is authorized by a failed gate.
