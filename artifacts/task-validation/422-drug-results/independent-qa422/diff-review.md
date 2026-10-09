# Independent diff review

Reviewed original four criteria before implementer contract or recipes; independently verified issue body and zero comments with GitHub read. Candidate b5f471cd2cd56839e7ebbd0d3daf0bbf04791468 against80b313 has exactly four presentation paths.

- RicercaFarmaco.tsx: visible rows derive from original hook records; callbacks still pass exact document and original record. Full source description, separate form, AIC and secondary PA are rendered as escaped React text. Document accessible name includes raw package data plus AIC. Reuses existing TableFilters unchanged. Count explicitly loaded-only; continuation and error controls depend on original hook, not filtered rows. Query/criterion changes clear filters in the same reducer transition; already selected criterion preserves filters.
- drugSearchPresentation.ts: literal case-folded name/description matching, exact raw form equality, no numeric/clinical inference from ingredient quantities. No-filter returns identical original array; filtering preserves original order and record references. Form options are unique source strings from all loaded records and sort only independent string values. No mutation, network, new endpoint or authority change.
- CSS: token colors, prominent wrapping package text and distinct form badge. Existing row/text wrapping improved without hiding/truncating authoritative strings. Actual browser viewport checks required separately.
- Six new unit tests cover object identity/order, raw forms/missing metadata, ingredient exclusion, unique RCP/FI names and atomic transitions. Actual independent focused suite34 PASS.

No correctness findings from source review. No backend/schema/config/API/dependency/auth changes. No debug logs/raw HTML/SQL in new source. Existing role gates and document URL loader remain unchanged. Native-hook launcher changes in QA checkout excluded from application inputs and not authored by QA.

Security phase: typed presentation event boundaries and React escaped output; no new privileged routes; no clinical data in queries; no dependencies or config weakening. Synthetic-only isolated browser APIs remain blocked before wire. Source scan PASS; configured credential and expanded trace privacy scan follows after evidence generation. This is scoped, not a global vulnerability or clinical-document correctness certification.
