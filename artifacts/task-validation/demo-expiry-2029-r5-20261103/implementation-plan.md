# Fixed finite 2029 demo: same unpublished implementation round 5

Latest actual user direction replaces indefinite availability with expiry in 2029.
The date assumption is 2029-12-31T23:59:59Z, announced before implementation.
Only the dedicated synthetic demo may change. Production is excluded.

## Immutable history and ownership

Parent PR523 is merged at d2a08b4850dd954bb790e35f2ed350d5eeacd1c4.
PR525 remains the sole linked child for issue524. Four historical implementation
attempts and two genuine Claude reviews are retained; implementation limit5,
review limit4. This is the already-authorized unpublished fifth, not a sixth.
The unpublished indefinite candidate31b95b0e remains preserved and is not activated.
Technical PR527 is independent and is not a prerequisite for this smaller change.

## Source design

1. Keep the ordinary seven-day renewal module byte-identical to main. Its initial
   direct-route 2029 RED specification is preserved in commit26ba86a9. The final
   design adds a dedicated fixed-key, fixed-value action instead of relaxing that
   route. A new negative regression asserts ordinary renewals still reject2029.
2. Bind the new action to reviewed merged/current source, exact subject/owner,
   real Max approval, independent finalQA, append-only native history and a fresh
   actual-user-session capability. A prior finite/permanent capability is not
   transferable. Re-observe owner/revocation/current-main after asynchronous reads.
3. Preserve parent523's acknowledged November9 stage and separately failed exact
   deployment. Bind their exact immutable request, authorization, execution and
   dispatch digests. Require authenticated failed-run metadata and actual Railway
   failed/active deployment IDs and sources. Uncertain/in-flight operations block.
4. Protected fixed-demo workflow inspects by default. Tests run before secrets.
   A durable single-use claim and write-intent precede exactly one variableUpsert:
   DEMO_AUTH_EXPIRES_AT=2029-12-31T23:59:59Z, skipDeploys=true. No automatic deploy,
   variable inventory/replacement, SQL, secret output or production mutation.
5. Add .dockerignore to keep tracked QA archives out of Railpack's build context,
   retaining backend, Prisma migrations, workspace manifests/locks, scripts/fonts.
   Preserve evidence on disk and in Git. Existing Railway config stays unchanged.

## Validation and separately authorized release

Run dedicated/ordinary-renewal/build-context tests and complete application build.
Dedicated QA independently reviews all eight source paths and existing future-date
auth policy/five-profile behavior using synthetic-only isolated fixtures.
Publish exact source/evidence to existing PR525, wait for all exact-head required
CI checks, then request the genuine third Claude Max review through trusted main.
No API fallback, proof omission, allowance reset or approval transfer is permitted.
Final independent Codex QA and protected merge precede any provider configuration.
After merge, inspect actual demo topology/failure metadata, stage the fixed expiry,
then separately authorize/deploy the exact reviewed source with fresh dispatch.
Never repoint parent523's existing deployment history to the new source.

## Online acceptance, not yet satisfied

Before claiming resolution, verify /ready exact deployed source/demo and public
/auth/status mode=demo, simulator=true, temporaryDemo=true, syntheticOnly=true,
expiresAt=2029-12-31T23:59:59Z (.000Z equivalent accepted). Verify all five server-
owned synthetic profile identities and desktop/mobile picker after refresh with
sanitized screenshot/trace. Do not provision real patient records for tests.
Issue stays open until that actual deployment/browser proof exists.
