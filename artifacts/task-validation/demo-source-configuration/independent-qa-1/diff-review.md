# Independent full diff and security review

Reviewed all new source contents against frozen base and seal; there are exactly three new source files, with no modifications to application code or prior release/maintenance code.

- `configure-demo-source.mjs:5–29`: fixed target and endpoint, exact inventory projection and branch-only mutation. Official schema validates both queries. No deploy/create/delete/reconnect/variable mutation exists.
- `configure-demo-source.mjs:48–151`: bounded, typed, exact target/source/domain/provider checks; canonical sorted allowlisted inventory, detached and recursively frozen. Trigger pagination cannot be mistaken for uniqueness. Root, check policy, override and domain metadata remain part of the digest and post-write comparison.
- `configure-demo-source.mjs:161–193`: dedicated credential header, fixed HTTPS endpoint, redirect refusal, finite timeout, 256 KiB streaming cap and fixed diagnostics. Provider response bodies/errors are not logged or archived.
- `configure-demo-source.mjs:196–212`: strict manual repository/ref/SHA/run context; environment projection is limited to safe execution identifiers.
- `configure-demo-source.mjs:215–262`: inspect defaults read-only; missing digest rejects before a request; stale digest and fresh drift reject before any mutation; no-op makes zero writes; only `input.branch` is sent, once; exact after-read is required. The documented provider no-CAS limitation remains: after-read detects races and cannot make an external write atomic.
- `configure-demo-source.mjs:265–290`: context validated before credential use; receipt exclusive create and mode 0600; fixed diagnostic-only CLI errors; no environment dump.
- `configure-demo-source.yml:3–19,21–61`: manual-only inputs/default inspect, read-only GitHub permission, serialized provider lane, exact repository/main/SHA guard, protected environment, checkout pinned to reviewed SHA without persistent credentials, pinned actions, Node 22, no-credential tests, dedicated existing demo secret only on execution, no shell interpolation of input and only validated receipt uploaded.
- `configure-demo-source.test.mjs`: all 57 tests inspected and independently executed. No real provider calls. Synthetic fixture/loopback client injection is test-only; production endpoint validation is not weakened.

No correctness or security findings. No dependencies added. No PHI, real patient fixture, clinical payload log, new public route, authentication bypass, SQL, browser HTML injection or runtime CORS/env/production flag changes. The QA-only surface uses owned loopback HTTP, static markup plus textContent and synthetic state, starts only when explicitly running the QA script, and is never included in a production workflow/application.
