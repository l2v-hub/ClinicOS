# Task contract — expired demo authentication and truthful login

## Authority and ownership

The human explicitly requested the diagnosis and then said “Procedi” to renew
the demo-only access and repair the misleading login screen. Scope is separate
from issues506/516/475/470 and PR520; none of their review allowances or histories
may be reused. Root is integration/UI writer in C:/w-rv/auth-expiry20261102.
Operations author uses isolated C:/w-rv/auth-renewal-ops20261102; QA is read-only.
Baseline protected main: bc880a6dccc40d8dbad73c718c8aa4256562d254.

## Acceptance criteria

1. Loading, unavailable, malformed and server-disabled auth never render usable
   role/profile buttons or claim that demonstration access is available.
2. A disabled synthetic demo with an elapsed expiry displays “Accesso demo
   scaduto”. Server mode remains authoritative; browser time only selects copy.
3. Explicit retry clears stale state and can restore all five server-owned
   profiles. Login pending disables interactions; handleLogin also denies
   unavailable auth. Late server auth_disabled forces a fresh status check.
4. Confirmed legacy demo and Entra flows remain available; Entra no longer claims
   credential-free demo access. Backend authentication and policy gates unchanged.
5. Operational renewal changes ONLY DEMO_AUTH_EXPIRES_AT on the fixed demo
   project/environment/service/domain; finite duration MAX7days, expected prior
   expiry and one actual human-authorized consumed capability required. No
   generic variable mutation, arbitrary environment/service, secret export,
   production target, expiry removal, automatic renewal or implicit retry.
6. Stage once without implicit deployment; exact reviewed source deployment is a
   separate protected action. Require matching live demo readiness/auth status
   and five profiles before calling the access issue resolved online.
7. Focused and regression tests, independent security QA, genuine exact-SHA
   Claude Max review, final Codex and required CI precede protected merge/release.
   No API fallback, fabricated approval or unapproved extra review allowance.

## Safety envelope

No patient reads/writes, original documents, OCR/provider calls, SQL cleanup,
volumes, production authentication, backend switch or changes to AUTH_MODE,
ROLE_SIMULATOR flags, role assignments or policy. Browser acceptance uses only
synthetic intercepted APIs and never sends network to Railway or an identity
provider. Only fixed public status/readiness and profile metadata may be read
for operational proof. All public artifacts are sanitized and source-bound.

## Evidence and limits

Public auth/status on the actual configured demo reports expiry
2026-10-31T23:59:59Z, mode disabled/simulatorfalse/syntheticOnlytrue; ready reports
tierdemo/databaseok/policyok. This is an expiry guard, not deletion of profiles.
Dedicated fixed-target read-only preflight41494990323 SUCCESS on baselineBC.
Ruflo hierarchical coordination initialized with3agents; local memory lookup
reported no DB, routing hit a memory allocation failure. Neither is evidence
of application failure or permission to install/alter the primary workspace.
