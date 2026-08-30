# Cycle 59 task contract — AI response cache privacy

## Objective

Prevent browser and intermediary caches from retaining patient-bearing responses from every public `/ai` endpoint.

## Acceptance criteria

- `/ai/assistant`, `/ai/actions`, `/ai/voice`, `/ai/audit` and extraction responses receive `Cache-Control: private, no-store`.
- The policy runs before the standard JSON parser and every public AI router.
- Authentication denials and oversized-payload errors receive the same header as successful responses.
- Internal AI retains its existing private cache policy.
- Payloads, status mapping, authentication, rate limits and endpoint behavior remain unchanged.
- Focused tests, backend build/lint and independent reviews pass without new P0/P1 findings.

## Safety envelope

- No CORS, auth, assistant, action, audit or extraction data-flow changes.
- Do not stage unrelated local changes.
