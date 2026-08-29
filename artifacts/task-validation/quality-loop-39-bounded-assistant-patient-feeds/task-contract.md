# Cycle 39 task contract — bounded assistant diary and appointments

## Objective

Close the remaining unbounded patient diary and appointment gateway paths so a direct assistant tool or internal gateway request cannot bypass the timeline limits.

## Acceptance criteria

- Tenant and patient ACL checks remain before input-dependent database access.
- Runtime diary filters reject arrays, oversized author types, invalid dates, and inverted ranges.
- Diary filters execute in PostgreSQL before `LIMIT 101`; no post-fetch range filter remains.
- Diary data returns at most 100 rows, content at most 4,000 characters, and source excerpts at most 240 characters.
- Appointment range input rejects malformed or inverted values.
- Appointment data returns at most 100 rows, notes at most 1,000 characters, and omits operator/audit identifiers not needed by the assistant.
- Existing diary descending and appointment ascending ordering gains an ID tie-breaker.
- Row overflow or field excerpts set `truncated=true`, preserving the existing partial-result UI/TTS disclosure.
- Focused tests, lint, build, and independent security/UX review pass without P0/P1.

## Safety envelope

- No schema or authorization change.
- Preserve the first-window array row shapes needed by assistant/internal callers, adding only excerpt indicators and `truncated`.
- Use only parameterized Prisma SQL.
- Do not stage unrelated local changes.
