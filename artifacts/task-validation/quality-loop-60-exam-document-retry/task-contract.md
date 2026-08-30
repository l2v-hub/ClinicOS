# Cycle 60 task contract — explicit attachment load failure

## Objective

Ensure an attachment metadata failure in “Esami & Consulenze” is never presented as a trustworthy empty list.

## Acceptance criteria

- The shared metadata request has explicit loading, ready and error states.
- Non-2xx and network failures show one visible clinical load error above the three sections.
- The error explains that the attachment list may be incomplete and offers a retry.
- Retry returns immediately to a loading state and performs one shared metadata GET.
- Patient-scope abort/stale guards and existing upload/content behavior remain unchanged.
- Tests, build, lint comparison and independent reviews pass without new P0/P1 findings.

## Safety envelope

- No backend, document payload, upload, download or cartella data changes.
- Do not stage unrelated local changes.
