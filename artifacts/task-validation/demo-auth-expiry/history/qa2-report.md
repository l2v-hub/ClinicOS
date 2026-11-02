# Independent corrected UI QA — b1d6d89c

Verdict: PASS for this UI source scope, no remaining actionable finding found.
Not a Claude review, operational renewal authorization, deployment or online
issue-closure approval. The previously reproduced c104 P2 is preserved in
the parent independent-ui-qa directory/report, not removed or rewritten.

Source commit: b1d6d89c77ae1abe65a38d22e22c29b6a906f9bf
Source tree: 5e73d6511a96612610684146c17cbd1226e09a42
Review role: /root/auth_expiry_qa, read-only source.

## Fresh execution on the corrected source

- TypeScript + production frontend build: PASS.
- Focused authAvailability/loginAvailability tests: 7 PASS, zero failures.
- Exact committed browser runner, unmodified: 26 PASS at1280/390. Original
  assertions retained; added HTTP503, bad JSON, timeout and actual simulator404
  expiry scenarios. QA_EVIDENCE_DIR points only to this task's dedicated
  independent-ui-qa2 evidence folder. No derived runner was necessary this time.
- All browser cases report zero real outbound and clinical writes; no page
  errors or horizontal overflow.
- Tracked source clean and exact HEAD/tree unchanged throughout execution.

The full1586 frontend suite passed independently on c104; it is historical
regression evidence, NOT falsely attributed to b1. This revised run rebuilt
and repeated focused tests/browser plus reviewed the two-file delta. A final
integrated CI gate remains necessary after operational-source integration.

## Prior P2 resolved

The simulator session failure branch now recognizes simulator_disabled and
auth_disabled, calls the same retryAuthStatus used for legacy auth/me failure
and manual retry, and clears the stale public status before rechecking. The
browser regression loads five profiles, returns real-shaped404 from synthetic
session creation after expiry, then verifies a second status read, removal of
all stale profiles and the explicit expiry message/retry action at both widths.
No identity/role is accepted from a failed session response.

## Security and rendering

Backend auth expiry/identity/simulator gates and frontend Entra/token/session
implementations remain unchanged relative to mainBC. Public status is never
an identity grant; server mode gates the UI and browser clock selects only the
disabled-state explanation. Loading/failure/unknown status cannot start login.

Independently viewed actual expired390, late-simulator-expiry390 and retry390
synthetic screenshots. Expired state shows the complete centered card with
“Accesso demo scaduto”, retry action and no profiles; successful retry shows
all five synthetic server-defined profiles. The tool visually collapsed the
second identical image to a thin strip; byte equality and PNG dimensions are
checked separately to distinguish a display-transport artifact from bad PNG
evidence. No screenshot was edited or reconstructed.

## Boundaries and handoff

No real ClinicOS authentication/session, clinical reads/writes, secrets,
provider invocation or remote state mutation. Genuine Entra OIDC exchange is
not exercised; only ready-state presentation/unchanged source are covered.
Operational renewal helper/workflow is outside this UI verdict and requires
its own integrated independent security review and protected CI/release gates.
Source freeze may be released for integration; retain exact source binding.

Execution metadata and logs: execution-receipt.json, command-results.json,
build/focused-tests/browser stdout+stderr in this directory. Browser JSON and
images: C:/w-rv/auth-expiry20261102/artifacts/task-validation/demo-auth-expiry/evidence/independent-ui-qa2/.
