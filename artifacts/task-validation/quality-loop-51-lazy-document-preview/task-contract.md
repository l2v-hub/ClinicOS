# Cycle 51 task contract — lazy authenticated document preview

## Objective

Prevent the patient source panel from downloading every clinical document when the operator needs to inspect only one.

## Acceptance criteria

- Opening a source panel requests metadata plus only the selected document content.
- Previous/next navigation requests a document on demand and deduplicates in-flight or cached reads.
- The in-memory blob cache is bounded to five documents.
- Closing the panel or changing patient/auth scope aborts content reads and revokes every object URL.
- Both metadata and content requests use the shared Entra/document authentication helper.
- Source file/page navigation, retry UI and local-upload previews remain compatible.
- Tests, build, focused lint and independent reviews pass without P0/P1.

## Safety envelope

- Do not change backend routes, document bytes, upload behavior or permissions.
- Never expose authenticated content through a public URL.
- Do not stage unrelated local changes.
