# PO15 retained intake NRS — final root decision

This final agreement supersedes the initial preparation proposal. Root authorized implementation after PO14 live verification. The exact backend contract remains in backend-contract.snapshot.md (SHA256 02f5a046ca85531902744136ae2534f782abb14136fb3b0cb78cf219ead09e23).

The existing scoped GET /patients/:id/intake-review retains draftId, deferredTherapies and sourceDocumentIds and adds a discriminated pair:

```ts
// HTTP 200, success
legacyPainDrafts: Array<{
  draftId: string;
  confirmedAt: string | null;
  pain: JsonValue; // exact original data.dolore JSON
}>;
legacyPainError: null;

// HTTP 200, over the bounded retained-pain budget
legacyPainDrafts: null;
legacyPainError: 'intake_review_legacy_pain_too_large';
```

Only when both fields are omitted may the frontend use []/null for old-server compatibility. Partial fields, unknown errors and incoherent pairs are invalid. There is no legacyPainDraftsError object and no global HTTP413 for this condition.

Include only confirmed, patient-scoped drafts with their own dolore property. Order confirmedAt descending with null last, then ID descending. Preserve original JSON exactly, including null, false, zero, objects and arrays. A clinically invalid shape stays inspectable and does not invalidate otherwise valid DTO JSON. SQL checks inclusive bounds of 100 drafts and 2,097,152 bytes using the sum of octet_length((data->'dolore')::text) before loading pain. Overflow preserves therapies and Cartella history, does not truncate, and renders an explicit NRS-only retryable error.

The NRS history labels these entries Dati dolore dall’ingresso · non confermati come valutazione. Severity is interpreted only for actual numeric integer scores 0..10. Confirmation metadata does not become an invented clinical date or author. Clinical values/notes appear first; original JSON is a secondary disclosure. Dates are presented in Italian Europe/Rome.

The existing intake-review request/result/error state is shared between NRS and the therapy panel, fenced by patient/session. Pending intake reads do not hide existing Cartella NRS history.

Existing intake data.dolore remains in the retained draft. Confirmation omits the old valutazioniNRS mapping and does not mutate the source JSON. Other NRS/vital-sign fields and data.parametri remain unchanged. Backend protects Cartella.valutazioniNRS under existing locks: omission preserves, deep-equal data permits other changes, different data rejects409 nrs_legacy_read_only. Absent, null and [] remain distinct. The existing Tinetti import exception is unchanged.
