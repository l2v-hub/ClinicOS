# Analysis — independent issue522

The deployed Vercel config on mainBC explicitly chooses the fixed demo Railway
domain. Its public status reports expiresAt2026-10-31T23:59:59Z, mode disabled,
simulatorfalse, temporaryDemofalse and syntheticOnlytrue. Public readiness is
ready/tierdemo/databaseok/policyok. The code still defines all five server-owned
simulator identities; PR521 did not alter Login, App auth flow or backend gates.

productionDemoAuthEnabled requires a finite future expiry. Once it lapses,
operatorAuthMode returns disabled; the simulator consequently turns off. The
existing frontend maps every non-simulator state to the legacy two-card login,
including checking, failed status retrieval and disabled server configuration.
Its generic backend auth_disabled error misleadingly suggests only missing
AUTH_MODE, although an expired demo reaches the same branch.

No backend gate should be relaxed. The UI must show truthful unavailable or
expired states, with bounded status retrieval and explicit retry, and refuse
handler execution before session/draft effects. Existing Entra acquisition,
identity resolution and capability enforcement remain server-owned.

The fixed demo preflight41494990323 succeeded onBC using the existing protected
GitHub environment and project-scoped token. No variable or deployment mutation
was part of that preflight. The generic railway-set-var workflow is unsuitable
because it uses the legacy token/optional service and does not attest this demo
target. New staging must hardcode only DEMO_AUTH_EXPIRES_AT with skipDeploys,
consume one genuinely authorized operation and retain uncertainty without retry.
Actual data contents have not been inspected; syntheticOnly is a configuration
flag, not a certification that every existing uploaded document is synthetic.

## Retained UI candidate1 review

Checkpoint c104d79ddc4047ca39bd8cfd0150d56ef4b503f1 was independently reviewed.
Root focused7 tests passed; earlier full1583 passed before the additional three
component tests were discovered; root production build and18 synthetic actual-App
browser cases passed. This checkpoint is NOT approved: independent Codex found
and reproduced a real P2 in the simulator-specific late-expiry transition.

Five profiles loaded while active; after expiry the session endpoint returns404
code simulator_disabled. Candidate1 only rechecked auth on auth/me auth_disabled,
so it retained five stale profile buttons and offered no global status retry.
Independent synthetic evidence observed statusReads1, identitiesReads1,
sessionPosts1, authMeReads0, staleCards5, expiredHeading0, retry0. No outbound,
clinical access/write or pageerror. Preserve this checkpoint and findings; fix
the simulator branch and add the regression without hiding the failed case.

No Claude review, allowance, source change or authority from PR520 is used for
this separate issue. The actual grant6 forPR520 remains unconsumed and its
history/failure/review reports remain untouched.
