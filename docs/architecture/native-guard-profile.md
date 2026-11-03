# Native Max single-forward profile

Status: design and implementation candidate under PR527. Not qualified, activated,
approved, merged or deployed. The original demo review budget is unchanged.

## Reason and safety boundary

The complete prospective demo packet is 843365 serialized UTF-8 bytes before
future exact-head CI and feedback. The historical native profile observes a
128000 output-token default. A larger static transport limit cannot make this
packet admissible. Setting an environment output limit alone is also insufficient:
native Claude may perform output-recovery requests without increasing its turn
counter. No assertion, evidence requirement or observed model metadata is removed
to obtain a green result.

This candidate uses the unchanged, integrity-pinned native Claude Code binary,
genuine Max OAuth, and default official provider endpoints. It does not construct
an SDK model call or use an API key, alternate provider, alternate base URL or
fallback. HTTPS inspection/custom CAs are documented native network features:
https://code.claude.com/docs/en/network-config . That support is not qualification
of this implementation.

## Sole egress

A digest-pinned Linux container runs as nonroot with network none, read-only
rootfs, dropped capabilities, no-new-privileges, no Docker logging, bounded private
tmpfs, process and resource limits. Its only network-capable mount is a private
data-only Unix socket. A fixed launcher bridges loopback to that socket. The
container cannot reach the external network by ignoring proxy environment values.
No checkout, host HOME, controller channel, Docker socket or provider/project
credential store is mounted. OAuth bootstrap is private stdin, not argv or Docker
configuration. Private interception keys remain in parent memory; only the public
CA is mounted read-only. The parent's real upstream uses normal strict public TLS
trust and exact official hostnames, not the interception CA.

All CONNECT authorities, TLS SNI and inner Host values must agree. No open TCP
tunnel, redirect, arbitrary metadata POST, upgrade, alternate inference route or
unknown framing/schema is allowed. Metadata routes are finite and checked. Raw
request/response/debug/settings/token values are never public artifacts.

## Admission and ownership

1. Verify immutable source, feedback, inventory and required evidence as before.
2. Prepare all selected context without discounting the observed128000 default.
   A bounded32k request-output plan is provisional, not admission or a new model
   profile. It is effective only when the real native request has been sealed.
3. Launch a fresh source container and stage its entire bounded inference body
   in parent memory without forwarding any source inference upstream.
4. Strictly reject duplicate/ambiguous JSON and HTTP fields, unknown context,
   unsupported media/tools, mismatched complete prompt/schema/model and oversize.
   Count every model-visible text/block/schema, retaining embedded packet JSON
   escaping, plus native65536 safety margin and the actual body max_tokens. The
   upper bound must fit the genuine qualified context clamped to1000000.
5. Require positive genuine native managed-policy settlement. A transport marker
   or timeout is insufficient. Pending, failed, nonempty or unknown managed policy
   fails closed; no organization policy is skipped to make a request fit.
6. Only then acquire the existing canonical claim with exact subject, feedback,
   actor and ownership fencing and validate the actual claim transition.
7. A parent-only capability releases that exact in-memory body once. Before any
   asynchronous upstream work, the all-connections inference budget becomes zero.
   A second request, uncertain forwarding or retry poisons the operation. It does
   not grant a refund, replay or replacement round.
8. Validate the genuine upstream StructuredOutput and native successful envelope,
   requiring equivalent reports, correct subject/model, bounded usage and no
   helper/tool/compaction/second invocation. Existing native publication validation
   and uncertain-publication reconciliation remain authoritative.

Node HTTP forwarding reconstructs hop framing/header order. The invariant is
unchanged validated native body bytes and end-to-end header values, not a false
claim of byte-identical wire headers.

## Qualification and release gates

Pure and transport tests include duplicate escaped keys, invalid UTF-8, exact
capacity boundaries, additional context, concurrent requests, before-claim hold,
foreign claim, alias mutation, unknown endpoints, retry denial, response mismatch
and synthetic complete-context input. Actual Linux runtime tests must prove direct
IPv4/IPv6/DNS/proxy-bypass isolation and inspect the real container flags/mounts.
A Windows-only test run cannot establish those facts.

The candidate receives independent QA, exact CI and genuine Claude Max review
through the old trusted worker; it cannot review or qualify itself with real OAuth.
Only separately approved trusted main may execute actual new-profile qualification:
fresh genuine health/profile, synthetic complete packet plus40960 bytes CI/feedback
headroom, native request/body/output bounds, report equivalence, policy settlement
and immutable source/binary/image identities. Unknown actual native formats fail
qualification rather than silently widening the parser.

Qualification is not approval of application source. Actual final-head application
source, required CI and feedback still require full admission and their own existing
review allowance. The technical no-automatic-merge/no-automatic-deploy hold remains
in force. Demo restore and production promotion are separate; production is not
authorized.
