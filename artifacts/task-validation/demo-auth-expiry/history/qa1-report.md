# Independent UI QA — c104 candidate

Verdict: CHANGES REQUESTED (one P2 finding). This is not a Claude review or release approval.

Source commit: c104d79ddc4047ca39bd8cfd0150d56ef4b503f1
Source tree: 3cd98ef45f4aec2e3b4d7e734e51ac114491279a
Base: bc880a6dccc40d8dbad73c718c8aa4256562d254
Checkout: C:/w-rv/auth-expiry20261102
Independent reviewer: /root/auth_expiry_qa; read-only source role.

## Execution

- `npm run build:frontend`: PASS (TypeScript + real production build). Existing
  chunk-size/performance warnings, not errors; log retained.
- `npm test -w frontend`: PASS, 1586 tests, zero failed/cancelled/skipped/todo.
- Committed `e2e/auth-expiry.mjs` assertions and scenarios: PASS, 18 cases at
  desktop1280 and mobile390. Actual built App; no test-only Login replacement.
- Separate synthetic late-simulator-expiry reproduction: finding confirmed.
- Visual inspection of independent expired390/retry390 screenshots: expired
  login has no actionable role cards; retry shows all five synthetic server
  profiles, without horizontal overflow. Stale late-expiry screenshot also read.

### Evidence isolation and retained harness failure

The committed browser runner hardcodes the author's output directory. To avoid
overwriting that evidence, a private derived copy changes only project-root,
evidence-output and dependency-resolution constants. All assertions/scenarios
remain unchanged. The first private copy resolved Playwright's CJS entry as if
it supported named ESM exports, failed before browser launch, and is retained
in browser.stderr.log with command-results.json. The corrected adapter uses
the same installed CJS module's default export. Provenance/hashes are recorded
in runner-provenance-corrected.json and browser-corrected-command.json. No test
was disabled or weakened to obtain the passing browser result.

## Finding P2 — late simulator expiry remains in stale ready state

In App.handleLogin's simulator session branch, a non-OK POST response sets only
loginError and returns. Auth status is refreshed only for auth_disabled from
the subsequent /auth/me response, which this branch never reaches.

The real backend simulator gate in backend/src/routes/authz.ts returns404 with
code simulator_disabled when the demo expires. Reproduction on this candidate:

1. Synthetic /auth/status returns demo/simulator enabled; five server-defined
   synthetic profiles load.
2. Expire the synthetic server state, then click Medico.
3. Intercepted /auth/simulator/session returns404 simulator_disabled (matching
   the real gate's shape).
4. The screen shows “Simulatore ruoli non attivo” but retains all five stale
   actionable profile cards and lacks “Ricontrolla accesso”. No fresh status
   fetch occurs, so the explanatory expired screen cannot appear without reload.

Observed counts: statusReads1, identitiesReads1, sessionReads1, authMeReads0,
profileCards5, expiredHeading0, globalRetry0; no page errors or outbound/clinical
requests. See late-simulator-expiry-reproduction.json and
late-simulator-expiry-reproduced-390.png.

Requested correction: on the simulator session's authoritative
simulator_disabled failure, invalidate/recheck auth status and stop showing
stale identities. Add a regression for this actual simulator path at both
widths. Preserve the legacy auth/me late-expiry regression and server gates.

## Security and scope

Backend ai/auth.ts, authz/simulator.ts, app.ts and frontend entraAuth.ts and
operatorSession.ts are byte-identical to base. The server remains the identity,
role and expiry authority. Client clock chooses disabled-state explanatory text
only; it cannot grant access. Unknown/malformed status is blocked; handler also
checks readiness rather than relying only on hidden buttons.

All browser tests used intercepted synthetic API, loopback preview, no actual
authentication/session creation or clinical endpoint calls. No credentials,
patient text, real documents, provider calls, remote writes or release actions.
Entra's real OIDC redirect/token flow was not exercised; its implementation is
unchanged and only ready-state rendering was covered.

Tracked source remained clean and HEAD/tree unchanged throughout these runs.
Generated build caches and independent evidence were the only writes. Root was
informed that this candidate is not approved and the source freeze may now be
released for the requested correction. Re-review must bind a new exact commit.
