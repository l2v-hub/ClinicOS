# Cycle 53 task contract — abort obsolete medication searches

## Objective

Ensure rapid typing, criterion changes and unmounts leave at most one active medication-directory request per search component.

## Acceptance criteria

- Both medication search components create one `AbortController` per debounced query.
- Every fetch receives its controller signal.
- Effect cleanup clears the debounce and aborts an already-started request.
- Abort errors remain silent while genuine network failures keep the existing error state.
- Existing stale-response guards and URL encoding remain intact.
- Tests, build and independent reviews pass without new P0/P1 findings.

## Safety envelope

- Do not change search thresholds, result limits, endpoints, selection behavior or medication data.
- Do not stage unrelated local changes.
