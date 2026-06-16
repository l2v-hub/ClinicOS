# REQ-035 — Runtime mapping (traced)

## Chain
risposta AI (Mistral) → `runtimeTranscribe` produces integral markdown → `resultData.rawText`.
`runJob` built `_narrative` from the SECTIONS pass (`buildNarrativeDraft(sections)`) or the
rawText fallback `narrativeFromRawText` (which dumped everything into `unmappedText`). In both
cases the per-section `*Text` (anamnesisText, diagnosisText, …) ended up EMPTY, so
`sectionsFromNarrative` → ImportSectionsReview cards had empty `rawText` → Modifica textarea
initialised from "" .

## Root cause
The good section text lived in `rawText` (markdown with `## …` headings) but nothing parsed it
into the canonical `*Text` fields.

## Fix (no new AI call)
- New `backend/src/ai/sections/markdown-parse.ts`: `parseMarkdownSections` / `parseNarrativeFromMarkdown`
  split rawText by markdown/plain headings, map each to a canonical field, accumulate text up to
  the next *different* canonical heading (anamnesi subtitles stay in one ANAMNESIS block, `##`
  kept). `detectSectionLoss` is the NARRATIVE_SECTION_CONTENT_LOST guard.
- `runJob`: `_narrative = parseNarrativeFromMarkdown(rawText, demo)`; falls back to sections pass /
  rawText only if the markdown yielded no sections.
- `getJobResult` + `rebuildNarrativeDraftFromExistingExtraction(jobId)`: idempotently re-build the
  narrative from stored rawText for already-processed jobs (self-heal, no model call).
- Frontend `DischargeImportModal`: `effectiveSections` prefers whichever source carries section
  TEXT (narrative-from-markdown is reliable).

## Verified
E2E: review opened; Anamnesi card shows the text; **Modifica textarea starts with
`## Anamnesi Patologica Recente:`** and includes the Remota subtitle in the same block.
