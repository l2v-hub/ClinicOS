# Task Contract

## Task

- Title: Quality loop 15 explicit demo authentication
- Slug: `quality-loop-15-explicit-demo-auth`
- Type: Security/authentication/configuration hardening
- Date: 2026-08-29

## Baseline

When `AUTH_MODE` is absent, every non-production process silently enables demo authentication and
trusts synthetic `X-Operator-*` headers. A forgotten or incomplete staging configuration can
therefore expose protected endpoints under a self-declared identity. Local documentation and CI do
not consistently make the demo decision explicit.

## Expected Behaviour

Missing, empty, misspelled and unsupported auth modes always fail closed. Demo headers are accepted
only when both `AUTH_MODE=demo` and `NODE_ENV=development|test` are explicit. Entra remains the only
production mode. Supported local and CI workflows declare their synthetic identity mode visibly.

## Acceptance Criteria

- AC1: missing or invalid `AUTH_MODE` resolves to `disabled` in every environment.
- AC2: `AUTH_MODE=demo` resolves to demo only in `development` or `test`.
- AC3: production and staging reject demo mode; explicit Entra behaviour is unchanged.
- AC4: spoofed operator headers with no auth mode receive 503 and never populate `req.operator`.
- AC5: backend test orchestration and both AI import CI jobs opt into test/demo explicitly.
- AC6: README, workstation setup, `.env.example`, Railway and Entra guidance agree on auth mode and
  backend port 3001.
- AC7: focused auth/RBAC/security tests, frontend regression, builds, scoped lint, diff check and
  two independent reviews pass.

## Gate Status

PASS FOR BRANCH WITH DB REGRESSION GATE OPEN — production deploy remains externally gated
