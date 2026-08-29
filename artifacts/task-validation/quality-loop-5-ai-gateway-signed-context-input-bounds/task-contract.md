# Task Contract

## Task

- Title: Quality loop 5 AI gateway signed context and input bounds
- Slug: quality-loop-5-ai-gateway-signed-context-input-bounds
- Type: security/performance refactor
- Date: 2026-08-29

## Impact Classification

| Area | Impacted |
|---|---:|
| Frontend/UI | no |
| Backend/API | yes |
| Database/Persistence | query shape only |
| Agnos AI / Chatbot | yes |
| Voice | yes, shared assistant gateway |
| OCR / Import | no |
| Auth / Permissions | yes |
| Privacy / Security | yes |
| Config / Env | yes |

## Current Behaviour

The internal AI gateway accepts a service token and then trusts independent `X-AI-User-Id`,
`X-AI-Roles` and `X-AI-Permitted-Patients` headers. Anyone holding the service token can therefore
self-assert an administrator role or a wider patient scope. Patient search also accepts unbounded or
empty inputs and applies patient ACL filtering after a global query capped at 500 rows.

## Expected Behaviour

Internal AI calls must present both the service token and a compact, short-lived context envelope
signed with a separate secret. Legacy identity/role/scope headers are not an authorization source.
Search inputs must be bounded and structurally valid, and patient ACLs must be part of the database
query before row limits are applied. The public operator assistant continues to derive its context
from the authenticated backend request.

## Acceptance Criteria

- AC1: service token plus legacy `X-AI-*` identity headers is rejected; unsigned context is rejected.
- AC2: signed context uses HMAC-SHA256 with constant-time comparison, a separate secret, a maximum
  envelope size and a validity window of at most five minutes.
- AC3: context fields use allowlists/bounds: known roles, safe IDs, maximum 100 permitted patients,
  and a bounded request identifier; malformed, expired or future envelopes fail closed.
- AC4: patient search rejects an empty request unless a structured filter exists; text, token count,
  dates, limits and identifiers are bounded and validated before Prisma receives them.
- AC5: a non-null patient ACL is included in the Prisma `where` clause before `take`; an explicitly
  empty ACL returns no rows without querying all patients.
- AC6: patient search selects only fields needed by the assistant result rather than the full patient
  record.
- AC7: focused unit/API tests cover signature tampering, expiry, legacy spoofing, input bounds and ACL
  query construction; build, relevant regression tests and secret scans remain green.

## Test Plan

| Test type | Required | Reason |
|---|---:|---|
| Unit | yes | Context crypto/parser and input validators |
| Integration | yes | Internal gateway middleware/route rejection behavior |
| API | yes | Search contract and ACL query shape |
| Playwright | no | No visual behavior changes |
| Persistence after refresh | no | No persisted UI state |
| Agnos action registry | yes | Assistant gateway regression |
| Voice simulation | no | Voice shares the same public assistant route; no media change |
| OCR/import test | no | Unchanged |
| Security/privacy scan | yes | Authorization boundary and PHI minimization |

## Evidence Plan

- validation-report.md
- focused AI gateway and route test output
- monorepo build output
- secret/dependency scan output
- independent lightweight security and performance reviews

## Risks

- Existing external callers of `/internal/ai/*` must migrate to the signed envelope. No repository
  caller currently uses that route; the secure default intentionally rejects legacy calls.
- A signed envelope proves that a trusted issuer created the context. The issuer remains responsible
  for deriving patient scope from server-side policy; the gateway will never widen the signed scope.
- Database runtime/EXPLAIN evidence remains unavailable until a PostgreSQL test environment is
  configured; query-shape tests provide the current evidence.

## Gate Status

CLOSED — VERIFIED
